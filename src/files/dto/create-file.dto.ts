
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateFileDto {

  @ApiProperty({ example: 'report.pdf', description: 'File name including extension' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'application/pdf', description: 'MIME type of the file' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes' })
  @IsInt()
  @IsPositive()
  size: number;

  @ApiProperty({ example: 1, description: 'ID of the user uploading the file' })
  @IsInt()
  @IsPositive()
  userId: number;

}