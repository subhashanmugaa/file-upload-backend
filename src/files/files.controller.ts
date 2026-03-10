import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { ParseIntPipe } from '@nestjs/common';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  generateUploadUrl(@Body() createFileDto: CreateFileDto) {
    return this.filesService.create(createFileDto);
  }

  @Get(':id')
  getAllFiles(@Param('id',ParseIntPipe) userId: number) {
    return this.filesService.findAll(userId);
  }

  @Patch(':id/confirm-upload/')
  confirmUpload(@Param('id',ParseIntPipe) id: number,@Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(id,updateFileDto);
  }

  @Get(':id/download-url')
  getDownloadUrl(@Param('id',ParseIntPipe) id:number){
    return this.filesService.getDownloadUrl(id);
  }

  @Delete(':id')
  remove(@Param('id',ParseIntPipe) id: number) {
    return this.filesService.remove(id);
  }


}
