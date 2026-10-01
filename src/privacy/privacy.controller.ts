import { Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { actorFromRequest } from '../common/actor';
import { PrivacyService } from './privacy.service';

@Controller('api/v1')
export class PrivacyController {
  constructor(@Inject(PrivacyService) private readonly service: PrivacyService) {}
  @Get('privacy/request') status(@Req() r: FastifyRequest) { return this.service.status(actorFromRequest(r)); }
  @Post('privacy/request') request(@Req() r: FastifyRequest) { return this.service.request(actorFromRequest(r)); }
  @Post('privacy/request/cancel') cancel(@Req() r: FastifyRequest) { return this.service.cancel(actorFromRequest(r)); }
  @Post('admin/privacy/:actorId/anonymize') anonymize(@Req() r: FastifyRequest, @Param('actorId') actorId: string) { return this.service.anonymize(actorFromRequest(r), actorId); }
  @Get('admin/platform-audit-events') audits(@Req() r: FastifyRequest) { return this.service.audits(actorFromRequest(r)); }
  @Get('admin/operations/checks') checks(@Req() r: FastifyRequest) { return this.service.checks(actorFromRequest(r)); }
  @Get('admin/operations/retention-preview') retentionPreview(@Req() r: FastifyRequest) { return this.service.retentionPreview(actorFromRequest(r)); }
  @Post('admin/operations/release-gate') releaseGate(@Req() r: FastifyRequest) { return this.service.releaseGate(actorFromRequest(r)); }
}
