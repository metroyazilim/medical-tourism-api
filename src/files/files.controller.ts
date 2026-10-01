import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse } from '../common/http';
import { FilesService } from './files.service';

const intent = z.object({ contextType: z.enum(['INQUIRY', 'LEAD', 'MESSAGE', 'VERIFICATION']), contextId: z.string().min(1), filename: z.string().min(1).max(200), mimeType: z.string().min(1).max(100), size: z.number().int().positive(), checksum: z.string().min(8).max(200), idempotencyKey: z.string().max(200).optional() });
const checksum = z.object({ checksum: z.string().min(8).max(200) });
const scan = z.object({ state: z.enum(['AVAILABLE', 'QUARANTINED', 'REJECTED']) });

@Controller('api/v1/files')
export class FilesController {
  constructor(@Inject(FilesService) private readonly service: FilesService) {}
  @Post('upload-intents') intent(@Req() r: FastifyRequest, @Body() b: unknown) { return this.service.createIntent(actorFromRequest(r), parse(intent, b)); }
  @Post(':id/complete') complete(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.complete(actorFromRequest(r), id, parse(checksum, b).checksum); }
  @Get(':id') get(@Req() r: FastifyRequest, @Param('id') id: string) { const item = this.service.get(actorFromRequest(r), id); return { id: item.id, contextType: item.contextType, contextId: item.contextId, filename: item.filename, mimeType: item.mimeType, size: item.size, checksum: item.checksum, state: item.state, version: item.version }; }
  @Get(':id/download') download(@Req() r: FastifyRequest, @Param('id') id: string) { return this.service.download(actorFromRequest(r), id); }
  @Post(':id/delete') delete(@Req() r: FastifyRequest, @Param('id') id: string) { return this.service.delete(actorFromRequest(r), id); }
  @Post('/admin/:id/scan-result') scan(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.scan(actorFromRequest(r), id, parse(scan, b).state); }
}
