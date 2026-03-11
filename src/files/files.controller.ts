import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOperation({ summary: 'Generate a presigned S3 URL to upload a file' })
  @ApiBody({ type: CreateFileDto })
  @ApiResponse({ status: 201, description: 'Returns a presigned S3 PUT URL' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Post('upload-url')
  generateUploadUrl(@Body() createFileDto: CreateFileDto) {
    return this.filesService.create(createFileDto);
  }

  @ApiOperation({ summary: 'Get all files for a user by user ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'name', 'size'], description: 'Field to sort by (default: createdAt)' })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'], description: 'Sort direction (default: DESC)' })
  @ApiResponse({ status: 200, description: 'Paginated list of files' })
  @Get(':id')
  getAllFiles(
    @Param('id', ParseIntPipe) userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'name' | 'size',
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    return this.filesService.findAll(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      sortBy ?? 'createdAt',
      order ?? 'DESC',
    );
  }

  @ApiOperation({ summary: 'Confirm file upload and store the ETag' })
  @ApiParam({ name: 'id', description: 'File ID', type: Number })
  @ApiBody({ type: UpdateFileDto })
  @ApiResponse({ status: 200, description: 'File status set to PROCESSING' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 409, description: 'File is not in UPLOADING state' })
  @Patch(':id/confirm-upload/')
  confirmUpload(@Param('id',ParseIntPipe) id: number,@Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(id,updateFileDto);
  }

  @ApiOperation({ summary: 'Generate a presigned S3 URL to download a file' })
  @ApiParam({ name: 'id', description: 'File ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns a presigned S3 GET URL' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 409, description: 'File is not in COMPLETED state' })
  @Get(':id/download-url')
  getDownloadUrl(@Param('id',ParseIntPipe) id:number){
    return this.filesService.getDownloadUrl(id);
  }

  @ApiOperation({ summary: 'Delete a file from S3 and the database' })
  @ApiParam({ name: 'id', description: 'File ID', type: Number })
  @ApiResponse({ status: 200, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @Delete(':id')
  remove(@Param('id',ParseIntPipe) id: number) {
    return this.filesService.remove(id);
  }

  @ApiOperation({ summary: 'Generate a presigned S3 URL to update a file (creates a new version)' })
  @ApiParam({ name: 'id', description: 'File ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns a presigned S3 PUT URL for the same storageKey (S3 creates a new version)' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 409, description: 'Previous upload is not complete' })
  @Get(':id/update-upload-url')
  updateUploadUrl(@Param('id',ParseIntPipe) id: number) {
    return this.filesService.getUpdateUploadUrl(id);
  }

  @ApiOperation({ summary: 'Get all versions of a file' })
  @ApiParam({ name: 'id', description: 'File ID (any version)', type: Number })
  @ApiResponse({ status: 200, description: 'List of all S3 object versions for this file (VersionId, LastModified, Size, ETag, IsLatest)' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @Get(':id/versions')
  getVersions(@Param('id', ParseIntPipe) id: number) {
    return this.filesService.getVersions(id);
  }
}
