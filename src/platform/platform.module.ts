import { Module } from '@nestjs/common';
import { AppConfigService } from './config';
import { PlatformController } from './platform.controller';
import { PlatformStore } from './platform.store';

@Module({ controllers: [PlatformController], providers: [AppConfigService, PlatformStore], exports: [AppConfigService, PlatformStore] })
export class PlatformModule {}
