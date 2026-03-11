import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { S3Service } from 'src/S3/s3.service';
import { InjectRepository } from '@nestjs/typeorm';
import { File } from 'src/files/entities/file.entity';
import {Repository} from 'typeorm'

@Processor('file-processing-queue')
export class FileProcessor extends WorkerHost {

    constructor(@InjectRepository(File) private readonly fileRepository:Repository<File>,
        private readonly s3Service:S3Service){
            super();
    }

  async process(job: Job) {

    console.log(`Processing file: ${job.data.fileId} v${job.data.version}`);

    let file=await this.fileRepository.findOne({
      where:{
        id:job.data.fileId,
        version:job.data.version,
      }
    })

    if(!file) {
        console.log("File version not found. It might have been deleted.");
        return;
    }

    let response=await this.s3Service.getFileHead(file.storageKey);

    const s3Etag = response.ETag?.replace(/"/g, '');

    if(!s3Etag || file.etag !== s3Etag){
        file.status='FAILED';
        await this.fileRepository.save(file!);
    console.log(`File processing failed for ${file.id} v${file.version}: ETag mismatch`);
        return;
    }

     // Validate file type
    const allowedTypes = ['pdf', 'doc', 'docx'];

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(extension!)) {
      file.status = 'INVALID';
      await this.fileRepository.save(file!);
      await this.s3Service.deleteFile(file.storageKey);
      console.log(`Invalid file type for ${file.id} v${file.version}`);
      return;
    }

    file.size=Number(response.ContentLength);
    file.status='COMPLETED';
    await this.fileRepository.save(file!);

    console.log(`File processed: ${file.id} v${file.version}`);
  }
}