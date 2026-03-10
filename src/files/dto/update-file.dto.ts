import { ApiProperty } from '@nestjs/swagger';

export class UpdateFileDto {
    @ApiProperty({ example: '"d41d8cd98f00b204e9800998ecf8427e"', description: 'ETag returned by S3 after a successful upload' })
    etag: string;
}
