import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { Repository, Like, LessThanOrEqual } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { S3Service } from 'src/S3/s3.service';
import { User } from 'src/users/entities/user.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';


@Injectable()
export class FilesService {

  constructor(@InjectRepository(File) private readonly fileRepository:Repository<File>, 
  @InjectRepository(User) private readonly userRepository:Repository<User> ,
  private readonly s3Service:S3Service,
  @InjectQueue('file-processing-queue') private readonly fileProcessingQueue:Queue){

  }

  async create(createFileDto: CreateFileDto) {

    //validate if user exists 
    let user=await this.userRepository.findOne({where:{id:createFileDto.userId}})
    if(!user) throw new NotFoundException('the user does not exist');

    // Get next available id (MAX + 1)
    const result = await this.fileRepository
      .createQueryBuilder('f')
      .select('MAX(f.id)', 'maxId')
      .getRawOne();
    const nextId = (result?.maxId ?? 0) + 1;

    const { userId, ...fileData } = createFileDto;
    const newFile = this.fileRepository.create({
      ...fileData,
      id: nextId,
      version: 1,
      isLatest: true,
      user: { id: userId } as any,
    });
    await this.fileRepository.save(newFile);
    newFile.storageKey = `${newFile.name}${newFile.id}v${newFile.version}`;
    await this.fileRepository.save(newFile);
    const presignedUrl = await this.s3Service.getPresignedUrlForUpload(newFile.storageKey, newFile.type);
    return { fileId: newFile.id, presignedUrl };
  }

  async findAll(userId: number, page = 1, limit = 10, sortBy: 'createdAt' | 'name' | 'size' = 'createdAt', order: 'ASC' | 'DESC' = 'DESC',
    filter?: 'name' | 'size' | 'type' | 'createdAt' | 'status', filterValue?: string
  ) {
    const where: any = {
      user: { id: userId },
      isLatest: true,
    };

    if (filter && filterValue !== undefined) {
      if (filter === 'name') {
        where.name = Like(`%${filterValue}%`);
      } else if (filter === 'size') {
        where.size = LessThanOrEqual(Number(filterValue));
      } else {
        where[filter] = filterValue;
      }
    }

    const [data, total] = await this.fileRepository.findAndCount({
      where,
      order: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(fileId:number,updateFileDto: UpdateFileDto){
    const file=await this.fileRepository.findOne({where:{id:fileId,isLatest:true}})
    if(!file) throw new NotFoundException('the file does not exist');

    if(file.status !== 'UPLOADING')
      throw new ConflictException(`Cannot confirm upload: file is already in '${file.status}' state`);

    file.etag=updateFileDto.etag;
    file.status='PROCESSING';
    await this.fileRepository.save(file);
    await this.fileProcessingQueue.add('process-file', {
      fileId: file.id,
      version: file.version,
    });
    return file;
  }

  async getDownloadUrl(fileId:number){
    const file=await this.fileRepository.findOne({where:{id:fileId,isLatest:true}})
    if(!file) throw new NotFoundException('the file does not exist');

    if(file.status === 'UPLOADING') throw new ConflictException('File has not been uploaded yet');
    if(file.status === 'PROCESSING') throw new ConflictException('File is still being processed');
    if(file.status === 'FAILED') throw new ConflictException('File processing failed due to an ETag mismatch');
    if(file.status === 'INVALID') throw new ConflictException('File type is not allowed');

    return this.s3Service.getPresignedUrlForDownload(file.storageKey);
  }


  async remove(fileId: number) {
    const versions = await this.fileRepository.find({where:{id:fileId}})
    if(!versions.length) throw new NotFoundException('the file does not exist');

    for(const v of versions){
      if(v.status !== 'UPLOADING' && v.status !== 'INVALID')
        await this.s3Service.deleteFile(v.storageKey);
    }
    return this.fileRepository.remove(versions);
  }
  
  
  async getUpdateUploadUrl(fileId:number){
        const file=await this.fileRepository.findOne({where:{id:fileId,isLatest:true}, relations:['user']})
        if(!file) throw new NotFoundException('the file does not exist');
        if(file.status==='UPLOADING'||file.status==='PROCESSING') throw new ConflictException('hey you pevious upload is not complete');

        const nextVersion = file.version + 1;

        // Mark current latest as no longer latest
        await this.fileRepository.update({ id: fileId, isLatest: true }, { isLatest: false });

        // New row — same id, incremented version
        const newVersion = this.fileRepository.create({
          name: file.name,
          type: file.type,
          user: file.user,
          id: fileId,
          version: nextVersion,
          status: 'UPLOADING',
          isLatest: true,
        });
        await this.fileRepository.save(newVersion);
        newVersion.storageKey = `${newVersion.name}${newVersion.id}v${newVersion.version}`;
        await this.fileRepository.save(newVersion);

        const presignedUrl = await this.s3Service.getPresignedUrlForUpload(newVersion.storageKey, newVersion.type);
        return { fileId, presignedUrl };
  }

  async getVersions(fileId: number) {
    const versions = await this.fileRepository.find({
      where: { id: fileId },
      order: { version: 'ASC' },
    });
    if (!versions.length) throw new NotFoundException('the file does not exist');
    return versions;
  }
}
