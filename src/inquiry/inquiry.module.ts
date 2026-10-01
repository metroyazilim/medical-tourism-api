import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { PlatformModule } from '../platform/platform.module';
import { InquiryController } from './inquiry.controller';
import { InquiryService } from './inquiry.service';

@Module({ imports: [PlatformModule, MessagingModule], controllers: [InquiryController], providers: [InquiryService] })
export class InquiryModule {}
