import { User } from "src/users/entities/user.entity";
import {Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn} from "typeorm"

type Status="UPLOADING"|"PROCESSING"|"COMPLETED"|"FAILED"|"INVALID"

@Entity()
export class File {
    @PrimaryColumn({type:'int'})
    id:number;

    @PrimaryColumn({type:'int'})
    version:number;

    @Column({type:'varchar',length:50,nullable:false})
    name:string;

    @Column({type:'varchar',length:50,nullable:true})
    type:string;

    @Column({type:"enum", enum:['UPLOADING','PROCESSING','COMPLETED','FAILED','INVALID'],default:'UPLOADING'})
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

    @Column({nullable:true,type:'varchar', unique:true})
    storageKey:string;

    @Column({type:'boolean',default:true})
    isLatest:boolean;

}
