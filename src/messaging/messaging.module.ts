import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingStore } from './messaging.store';
import { ScreeningService } from './screening.service';

@Module({
  controllers: [MessagingController],
  providers: [MessagingStore, ScreeningService, MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
