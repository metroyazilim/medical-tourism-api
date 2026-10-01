import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';

@Module({ imports: [PlatformModule], controllers: [DiscoveryController], providers: [DiscoveryService] })
export class DiscoveryModule {}
