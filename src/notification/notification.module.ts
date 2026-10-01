import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({ imports: [PlatformModule], controllers: [NotificationController], providers: [NotificationService], exports: [NotificationService] })
export class NotificationModule {}
