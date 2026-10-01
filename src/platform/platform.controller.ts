import { Controller, Get, Inject } from '@nestjs/common';
import { AppConfigService } from './config';

@Controller()
export class PlatformController {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  @Get('health/live')
  live() { return { data: { status: 'ok' }, meta: { version: this.config.value.APP_VERSION } }; }

  @Get('health/ready')
  ready() { return { data: { status: 'ready', database: this.config.value.DATABASE_URL ? 'configured' : 'in-memory-adapter' }, meta: { version: this.config.value.APP_VERSION } }; }

  @Get('health/version')
  version() { return { data: { version: this.config.value.APP_VERSION, environment: this.config.value.NODE_ENV } }; }
}
