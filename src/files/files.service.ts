import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { Repository ,Like,LessThanOrEqual} from 'typeorm';
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

    const { userId, ...fileData } = createFileDto;
    const newFile = this.fileRepository.create({
      ...fileData,
      user: { id: userId } as any, // Map userId to the User relation
    });
    await this.fileRepository.save(newFile);
    newFile.storageKey = `${newFile.name}${newFile.id}`;
    await this.fileRepository.save(newFile);
    return this.s3Service.getPresignedUrlForUpload(newFile.storageKey, newFile.type);
  }

  async findAll(userId: number, page = 1, limit = 10, sortBy: 'createdAt' | 'name' | 'size' = 'createdAt', order: 'ASC' | 'DESC' = 'DESC',
    filter: 'name' | 'size' | 'type' | 'createdAt' | 'status' = 'status', filterValue: string = 'COMPLETED'
  ) {

    const where: any = {
      user: { id: userId },
    };
    
    if(filter==='name'){
      where.name=Like(`%${filterValue}%`)
    }
    else if(filter==='size'){
      where.size=LessThanOrEqual(Number(filterValue))
    }
    else{
      where[filter]=filterValue;
    }
    const [data, total] = await this.fileRepository.findAndCount({
      where,
      order: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(id:number,updateFileDto: UpdateFileDto){
    //validate if file exists 
    const file=await this.fileRepository.findOne({where:{id:id}})
    if(!file) throw new NotFoundException('the file does not exist');

    // only allow confirming upload when the file is still in UPLOADING state
    if(file.status !== 'UPLOADING')
      throw new ConflictException(`Cannot confirm upload: file is already in '${file.status}' state`);

    //update the file
    file.etag=updateFileDto.etag;
    file.status='PROCESSING';
    await this.fileProcessingQueue.add('process-file', {
      fileId: file.id,
    });
    return this.fileRepository.save(file);
  }

  async getDownloadUrl(id:number){
    const file=await this.fileRepository.findOne({where:{id:id}})
    //validate if file exists 
    if(!file) throw new NotFoundException('the file does not exist');

    if(file.status === 'UPLOADING') throw new ConflictException('File has not been uploaded yet');
    if(file.status === 'PROCESSING') throw new ConflictException('File is still being processed');
    if(file.status === 'FAILED') throw new ConflictException('File processing failed due to an ETag mismatch');
    if(file.status === 'INVALID') throw new ConflictException('File type is not allowed');

    return this.s3Service.getPresignedUrlForDownload(file.storageKey);
  }


  async remove(id: number) {
    //validate if file exists 
    const file=await this.fileRepository.findOne({where:{id:id}})
    if(!file) throw new NotFoundException('the file does not exist');

    // only delete from S3 if the file is known to be there:
    // UPLOADING = may not have been uploaded yet; INVALID = already deleted by the processor
    if(file.status !== 'UPLOADING' && file.status !== 'INVALID')
      await this.s3Service.deleteFile(file.storageKey);

    return this.fileRepository.remove(file);
  }
  
  
  async getUpdateUploadUrl(id:number){
        const file=await this.fileRepository.findOne({where:{id:id}})
        if(!file) throw new NotFoundException('the file does not exist');
        if(file.status==='UPLOADING'||file.status==='PROCESSING') throw new ConflictException('hey you pevious upload is not complete');
        file.status='UPLOADING';
        await this.fileRepository.save(file);
        return this.s3Service.getPresignedUrlForUpload(file.storageKey, file.type);
  }

  async getVersions(id: number) {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) throw new NotFoundException('the file does not exist');
    return this.s3Service.getFileVersions(file.storageKey);
  }
}
