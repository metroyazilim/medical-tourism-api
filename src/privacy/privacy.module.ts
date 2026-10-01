import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';

@Module({ imports: [PlatformModule], controllers: [PrivacyController], providers: [PrivacyService], exports: [PrivacyService] })
export class PrivacyModule {}
