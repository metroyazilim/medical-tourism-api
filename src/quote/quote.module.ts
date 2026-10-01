import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

@Module({ imports: [PlatformModule], controllers: [QuoteController], providers: [QuoteService], exports: [QuoteService] })
export class QuoteModule {}
