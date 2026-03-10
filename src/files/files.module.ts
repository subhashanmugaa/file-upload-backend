import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { S3Module } from 'src/S3/s3.module';
import { User } from 'src/users/entities/user.entity';
import { BullModule } from '@nestjs/bullmq';

import { FileProcessor } from './file.processor'

@Module({
  imports:[TypeOrmModule.forFeature([File, User]),S3Module,BullModule.registerQueue({name:'file-processing-queue'})],
  controllers: [FilesController],
  providers: [FilesService,FileProcessor],
})
export class FilesModule {}
