import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse } from '../common/http';
import { NotificationService } from './notification.service';

const create = z.object({ recipientId: z.string().min(1), category: z.string().min(1).max(80), channel: z.enum(['IN_APP', 'EMAIL', 'PUSH']), template: z.string().min(1).max(100), sourceType: z.string().min(1).max(80), sourceId: z.string().min(1), idempotencyKey: z.string().min(1).max(200) });
const preferences = z.record(z.array(z.enum(['IN_APP', 'EMAIL', 'PUSH'])).max(3));

@Controller('api/v1')
export class NotificationController {
  constructor(@Inject(NotificationService) private readonly service: NotificationService) {}
  @Get('notifications') list(@Req() r: FastifyRequest) { return this.service.list(actorFromRequest(r)); }
  @Post('notifications/:id/read') read(@Req() r: FastifyRequest, @Param('id') id: string) { return this.service.read(actorFromRequest(r), id); }
  @Get('notification-preferences') getPreferences(@Req() r: FastifyRequest) { return this.service.getPreferences(actorFromRequest(r)); }
  @Patch('notification-preferences') setPreferences(@Req() r: FastifyRequest, @Body() b: unknown) { return this.service.setPreferences(actorFromRequest(r), parse(preferences, b)); }
  @Post('system/notifications') create(@Req() r: FastifyRequest, @Body() b: unknown) { return this.service.create(actorFromRequest(r), parse(create, b)); }
  @Post('admin/notifications/:id/retry') retry(@Req() r: FastifyRequest, @Param('id') id: string) { return this.service.retry(actorFromRequest(r), id); }
  @Get('admin/notifications/failed') failed(@Req() r: FastifyRequest) { return this.service.failed(actorFromRequest(r)); }
}
