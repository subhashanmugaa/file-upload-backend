
import { ApiProperty } from '@nestjs/swagger';

export class CreateFileDto {

  @ApiProperty({ example: 'report.pdf', description: 'File name including extension' })
  name: string;

  @ApiProperty({ example: 'application/pdf', description: 'MIME type of the file' })
  type: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes' })
  size: number;

  @ApiProperty({ example: 1, description: 'ID of the user uploading the file' })
  userId: number;

}