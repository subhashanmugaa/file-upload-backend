import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { S3Service } from 'src/S3/s3.service';
import { InjectRepository } from '@nestjs/typeorm';
import { File } from 'src/files/entities/file.entity';
import {Repository} from 'typeorm'
import { NotFoundException } from '@nestjs/common';

@Processor('file-processing-queue')
export class FileProcessor extends WorkerHost {

    constructor(@InjectRepository(File) private readonly fileRepository:Repository<File>,
        private readonly s3Service:S3Service){
            super();
    }

  async process(job: Job) {

    console.log("Processing file:", job.data.fileId);

    let file=await this.fileRepository.findOne({where:{id:job.data.fileId}})

    if(!file) {
        console.log("File not found. It might have been deleted.");
        return;
    }

    let response=await this.s3Service.getFileHead(file!.name);

    const s3Etag = response.ETag?.replace(/"/g, '');

    if(file.etag!==String(s3Etag)){
        file.status='FAILED';
        await this.fileRepository.save(file!);
        return;
    }

     // Validate file type
    const allowedTypes = ['pdf', 'doc', 'docx'];

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(extension!)) {
      file.status = 'INVALID';
      await this.fileRepository.save(file!);
      await this.s3Service.deleteFile(file!.name);
      console.log("Invalid file type");
      return;
    }

    file.size=Number(response.ContentLength);
    file.status='COMPLETED';
    await this.fileRepository.save(file!);

    console.log("File processed");
  }
}