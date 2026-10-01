import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({ imports: [PlatformModule], controllers: [FilesController], providers: [FilesService], exports: [FilesService] })
export class FilesModule {}
