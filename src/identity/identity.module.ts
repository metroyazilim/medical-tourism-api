import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({ imports: [PlatformModule], controllers: [IdentityController], providers: [IdentityService] })
export class IdentityModule {}
