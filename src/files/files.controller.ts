import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOperation({ summary: 'Generate a presigned S3 URL to upload a file' })
  @Post('upload-url')
  generateUploadUrl(@Body() createFileDto: CreateFileDto) {
    return this.filesService.create(createFileDto);
  }

  @ApiOperation({ summary: 'Get all files for a user by user ID' })
  @Get(':id')
  getAllFiles(@Param('id',ParseIntPipe) userId: number) {
    return this.filesService.findAll(userId);
  }

  @ApiOperation({ summary: 'Confirm file upload and store the ETag' })
  @Patch(':id/confirm-upload/')
  confirmUpload(@Param('id',ParseIntPipe) id: number,@Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(id,updateFileDto);
  }

  @ApiOperation({ summary: 'Generate a presigned S3 URL to download a file' })
  @Get(':id/download-url')
  getDownloadUrl(@Param('id',ParseIntPipe) id:number){
    return this.filesService.getDownloadUrl(id);
  }

  @ApiOperation({ summary: 'Delete a file from S3 and the database' })
  @Delete(':id')
  remove(@Param('id',ParseIntPipe) id: number) {
    return this.filesService.remove(id);
  }

}
