import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse } from '../common/http';
import { AppointmentService } from './appointment.service';

const create = z.object({ startAt: z.string().datetime(), endAt: z.string().datetime(), timeZone: z.string().min(1).max(80) });
const transition = z.object({ expectedVersion: z.number().int().positive(), startAt: z.string().datetime().optional(), endAt: z.string().datetime().optional(), timeZone: z.string().max(80).optional(), reason: z.string().max(500).optional() });

@Controller('api/v1')
export class AppointmentController {
  constructor(@Inject(AppointmentService) private readonly service: AppointmentService) {}
  @Post('leads/:leadId/appointments') create(@Req() r: FastifyRequest, @Param('leadId') leadId: string, @Body() b: unknown) { return this.service.create(actorFromRequest(r), leadId, parse(create, b)); }
  @Get('leads/:leadId/appointments') list(@Req() r: FastifyRequest, @Param('leadId') leadId: string) { return this.service.list(actorFromRequest(r), leadId); }
  @Post('appointments/:id/confirm') confirm(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.transition(actorFromRequest(r), id, 'CONFIRMED', parse(transition, b).expectedVersion, parse(transition, b)); }
  @Post('appointments/:id/reschedule') reschedule(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const input = parse(transition, b); return this.service.transition(actorFromRequest(r), id, 'RESCHEDULE_REQUESTED', input.expectedVersion, input); }
  @Post('appointments/:id/cancel') cancel(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const input = parse(transition, b); return this.service.transition(actorFromRequest(r), id, 'CANCELLED', input.expectedVersion, input); }
  @Post('appointments/:id/complete') complete(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.transition(actorFromRequest(r), id, 'COMPLETED', parse(transition, b).expectedVersion, parse(transition, b)); }
  @Post('appointments/:id/no-show') noShow(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.transition(actorFromRequest(r), id, 'NO_SHOW', parse(transition, b).expectedVersion, parse(transition, b)); }
  @Get('leads/:leadId/journey') journey(@Req() r: FastifyRequest, @Param('leadId') leadId: string) { return this.service.journeyFor(actorFromRequest(r), leadId); }
}
