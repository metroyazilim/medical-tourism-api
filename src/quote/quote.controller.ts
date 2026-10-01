import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse } from '../common/http';
import { QuoteService } from './quote.service';

const item = z.object({ id: z.string().optional(), description: z.string().min(1).max(300), quantity: z.number().int().positive(), amountMinor: z.number().int().nonnegative(), included: z.boolean() });
const create = z.object({ currency: z.string().regex(/^[A-Z]{3}$/u), items: z.array(item).min(1).max(50), validityEnd: z.string().datetime() });
const update = create.partial().extend({ expectedVersion: z.number().int().positive() });
const version = z.object({ expectedVersion: z.number().int().positive(), idempotencyKey: z.string().max(200).optional(), reason: z.string().max(500).optional() });

@Controller('api/v1')
export class QuoteController {
  constructor(@Inject(QuoteService) private readonly service: QuoteService) {}
  @Post('leads/:leadId/quotes') create(@Req() r: FastifyRequest, @Param('leadId') leadId: string, @Body() b: unknown) { return this.service.create(actorFromRequest(r), leadId, parse(create, b)); }
  @Patch('quotes/:id') update(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const input = parse(update, b); return this.service.update(actorFromRequest(r), id, input, input.expectedVersion); }
  @Post('quotes/:id/publish') publish(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.publish(actorFromRequest(r), id, parse(version, b).expectedVersion); }
  @Post('quotes/:id/withdraw') withdraw(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.withdraw(actorFromRequest(r), id, parse(version, b).reason); }
  @Get('leads/:leadId/quotes') list(@Req() r: FastifyRequest, @Param('leadId') leadId: string) { return this.service.list(actorFromRequest(r), leadId); }
  @Get('quotes/:id') get(@Req() r: FastifyRequest, @Param('id') id: string) { return this.service.get(actorFromRequest(r), id); }
  @Post('quotes/:id/accept') accept(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const input = parse(version, b); return this.service.accept(actorFromRequest(r), id, input.expectedVersion, input.idempotencyKey); }
  @Post('quotes/:id/reject') reject(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const input = parse(version, b); return this.service.reject(actorFromRequest(r), id, input.expectedVersion, input.reason); }
  @Post('admin/quotes/:id/expire') expire(@Req() r: FastifyRequest, @Param('id') id: string) { return this.service.expire(actorFromRequest(r), id); }
}
