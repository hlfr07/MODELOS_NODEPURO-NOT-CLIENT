import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BackgroundModule } from './background/background.module';

@Module({
  imports: [BackgroundModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
