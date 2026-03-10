import { S3Client,GetObjectCommand,PutObjectCommand,DeleteObjectCommand,HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BadRequestException, UnauthorizedException,Injectable } from "@nestjs/common";

@Injectable()
export class S3Service{
    //s3 instance
    private s3Client:S3Client;
    private bucketName=process.env.S3_BUCKET;
    constructor(){
        this.s3Client=new S3Client({
            region:process.env.AWS_REGION,
            credentials:{
                accessKeyId:process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY!
            },
            requestChecksumCalculation: 'WHEN_REQUIRED'
        })
    }

    //to get presigned url

    async getPresignedUrlForUpload(Filekey:string,contentType:string){
        let command=new PutObjectCommand({
            Bucket:this.bucketName,
            Key:Filekey,
            ContentType: contentType,
        })

        let url=await getSignedUrl( this.s3Client,command,{expiresIn:60*60})
        
        if(!url){
            throw new UnauthorizedException();
        }
        return url;
    }

    async getPresignedUrlForDownload(Filekey:string){
        let command =new GetObjectCommand({
            Bucket:this.bucketName,
            Key:Filekey,        
        })

        let url =await getSignedUrl(this.s3Client,command,{expiresIn:60*60})
        if(!url){
            throw new UnauthorizedException();
        }

        return url;
    }

    async deleteFile(Filekey:string){
        try{
            let command=new DeleteObjectCommand({
                Bucket:this.bucketName,
                Key:Filekey,
            })

            let response=await this.s3Client.send(command);
            return response;
        }
        catch(error){
            console.error('S3 delete error:', error);
            throw new BadRequestException('failed to delete file');
        }
    }

    async getFileHead(Filekey:string){
        
        let command=new HeadObjectCommand({
            Bucket:process.env.S3_BUCKET,
            Key:Filekey,
        })

        let response=await this.s3Client.send(command);
        return response;
    }
}