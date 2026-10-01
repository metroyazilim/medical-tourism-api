import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse } from '../common/http';
import { DiscoveryService } from './discovery.service';

const favorite = z.object({ entityType: z.enum(['organization', 'doctor', 'treatment']), entityId: z.string().min(1) });
const target = z.object({ entityType: z.enum(['organization', 'doctor', 'treatment']), entityId: z.string().min(1) });

@Controller('api/v1/favorites')
export class DiscoveryController {
  constructor(@Inject(DiscoveryService) private readonly service: DiscoveryService) {}
  @Post() add(@Req() r: FastifyRequest, @Body() b: unknown) { const i = parse(favorite, b); return this.service.add(actorFromRequest(r), i.entityType, i.entityId); }
  @Get() list(@Req() r: FastifyRequest, @Query('limit') limit?: string) { return this.service.list(actorFromRequest(r), limit ? Number(limit) : undefined); }
  @Delete(':entityType/:entityId') remove(@Req() r: FastifyRequest, @Param() p: unknown) { const i = parse(target, p); return this.service.remove(actorFromRequest(r), i.entityType, i.entityId); }
}
