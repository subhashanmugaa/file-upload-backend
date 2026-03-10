import { User } from "src/users/entities/user.entity";
import {Entity,PrimaryGeneratedColumn,Column, ManyToOne, JoinColumn,CreateDateColumn} from "typeorm"

type Status="UPLOADING"|"UPLOADED"|"PROCESSING"|"COMPLETED"|"FAILED"|"INVALID"


@Entity()
export class File {
    @PrimaryGeneratedColumn()
    id:number;

    @Column({type:'varchar',length:50,nullable:false})
    name:string;

    @Column({type:'varchar',length:50,nullable:true})
    type:string;

    @Column({type:"enum", enum:['UPLOADING','UPLOADED','PROCESSING','COMPLETED','FAILED','INVALID'],default:'UPLOADING'})
    status:Status;

    @Column({nullable:true})
    size:number;

    @Column({type:'varchar',length:50,nullable:true})
    etag:string;

    @CreateDateColumn()
    createdAt:Date;

    @ManyToOne(()=>User)
    @JoinColumn({name:"user_id"})
    user:User;
}
