import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { S3Module } from 'src/S3/s3.module';
import { User } from 'src/users/entities/user.entity';


@Module({
  imports:[TypeOrmModule.forFeature([File, User]),S3Module],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
