import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
@Module({
  imports:[ConfigModule.forRoot({isGlobal:true}),TypeOrmModule.forRoot(
    {
      type:'postgres',
      host:process.env.POSTGRES_HOST,
      port:parseInt(<string>process.env.POSTGRES_PORT),
      username:process.env.POSTGRES_USER,
      password:process.env.POSTGRES_PASSWORD,
      database:process.env.POSTGRES_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize:true
    }
  ),
  BullModule.forRoot({
    connection:{
      host:'localhost',
      port:6379
    }
  }),
  UsersModule, FilesModule],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {
  constructor(){
    console.log(process.env.DB_HOST);
  }
}
