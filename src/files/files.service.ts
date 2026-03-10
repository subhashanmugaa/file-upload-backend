import { Injectable } from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { S3Service } from 'src/S3/s3.service';
@Injectable()
export class FilesService {

  constructor(@InjectRepository(File) private readonly fileRepository:Repository<File>,private readonly s3Service:S3Service){

  }

  async create(createFileDto: CreateFileDto) {
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
    const file=await this.fileRepository.findOne({where:{id:id}})
    file!.etag=updateFileDto.etag;
    file!.status='UPLOADED';
    return this.fileRepository.save(file!);
  }

  async getDownloadUrl(id:number){
    const file=await this.fileRepository.findOne({where:{id:id}})
    return this.s3Service.getPresignedUrlForDownload(file!.name);
  }


  remove(id: number) {
    return `This action removes a #${id} file`;
  }
}
