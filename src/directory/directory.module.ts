import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';

@Module({ imports: [PlatformModule], controllers: [DirectoryController], providers: [DirectoryService], exports: [DirectoryService] })
export class DirectoryModule {}
