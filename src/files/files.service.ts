import { Injectable , NotFoundException} from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { Repository } from 'typeorm';
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
    return this.s3Service.getPresignedUrlForUpload(newFile.name, newFile.type);
  }

  async findAll(userId: number) {
   return this.fileRepository.find({where:{user:{id:userId}}}) 
  }

  async update(id:number,updateFileDto: UpdateFileDto){
    //validate if file exists 
    const file=await this.fileRepository.findOne({where:{id:id}})
    if(!file) throw new NotFoundException('the file does not exist');

    //update the file
    file.etag=updateFileDto.etag;
    file.status='UPLOADED';
    await this.fileProcessingQueue.add('process-file', {
      fileId: file.id,
    });
    return this.fileRepository.save(file!);
  }

  async getDownloadUrl(id:number){
    const file=await this.fileRepository.findOne({where:{id:id}})
    //validate if file exists 
    if(!file) throw new NotFoundException('the file does not exist');
    return this.s3Service.getPresignedUrlForDownload(file!.name);
  }


  async remove(id: number) {
    //validate if file exists 
    const file=await this.fileRepository.findOne({where:{id:id}})
    if(!file) throw new NotFoundException('the file does not exist');

    //delete the file
    if(file.status!=='UPLOADING') 
    await this.s3Service.deleteFile(file!.name);

    return this.fileRepository.remove(file!);
  }
}
