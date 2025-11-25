import { Module } from '@nestjs/common';
import { BackgroundService } from './background.service';
import { BackgroundController } from './background.controller';

@Module({
  controllers: [BackgroundController],
  providers: [BackgroundService],
})
export class BackgroundModule {}
