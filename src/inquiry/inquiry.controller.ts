import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse } from '../common/http';
import { InquiryService } from './inquiry.service';

const draft = z.object({ treatmentId: z.string().min(1), country: z.string().length(2), city: z.string().max(100).optional(), summary: z.string().min(1).max(2000), language: z.string().min(2).max(35) });
const update = draft.partial().extend({ expectedVersion: z.number().int().positive() });
const submit = z.object({ organizationIds: z.array(z.string().min(1)).min(1).max(3), consentVersion: z.string().min(1), idempotencyKey: z.string().max(200).optional() });
const transition = z.object({ target: z.enum(['NEW', 'ACCEPTED', 'IN_DISCUSSION', 'AWAITING_PATIENT', 'QUALIFIED', 'CLOSED_WON', 'CLOSED_LOST']), expectedVersion: z.number().int().positive(), reason: z.string().max(500).optional(), idempotencyKey: z.string().max(200).optional() });
const assignment = z.object({ expectedVersion: z.number().int().positive(), reason: z.string().max(500).optional() });
const reassign = z.object({ organizationId: z.string().min(1), reason: z.string().min(1).max(500) });
const due = z.object({ inactiveSince: z.string().datetime() });
const reason = z.object({ reason: z.string().max(500).optional() });

@Controller('api/v1')
export class InquiryController {
  constructor(@Inject(InquiryService) private readonly service: InquiryService) {}
  @Post('inquiries') create(@Req() r: FastifyRequest, @Body() b: unknown) { return this.service.createDraft(actorFromRequest(r), parse(draft, b)); }
  @Patch('inquiries/:id') update(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const i = parse(update, b); return this.service.updateDraft(actorFromRequest(r), id, i, i.expectedVersion); }
  @Post('inquiries/:id/submit') submit(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const i = parse(submit, b); return this.service.submit(actorFromRequest(r), id, i.organizationIds, i.consentVersion, i.idempotencyKey); }
  @Post('inquiries/:id/cancel') cancel(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.cancel(actorFromRequest(r), id, parse(reason, b).reason); }
  @Post('inquiries/:id/close') close(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.close(actorFromRequest(r), id, parse(reason, b).reason); }
  @Get('inquiries') list(@Req() r: FastifyRequest) { return this.service.list(actorFromRequest(r)); }
  @Get('inquiries/:id') get(@Req() r: FastifyRequest, @Param('id') id: string) { return this.service.get(actorFromRequest(r), id); }
  @Post('leads/:id/assignment/accept') accept(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const i = parse(assignment, b); return this.service.acceptAssignment(actorFromRequest(r), id, i.expectedVersion, i.reason); }
  @Post('leads/:id/assignment/decline') decline(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const i = parse(assignment, b); return this.service.declineAssignment(actorFromRequest(r), id, i.expectedVersion, i.reason); }
  @Post('leads/:id/transition') leadTransition(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const i = parse(transition, b); return this.service.transitionLead(actorFromRequest(r), id, i.target, i.expectedVersion, i.reason, i.idempotencyKey); }
  @Post('leads/:id/revoke') revoke(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const body = z.object({ reason: z.string().max(500).optional() }).parse(b); return this.service.revokeGrant(actorFromRequest(r), id, body.reason); }
  @Post('admin/leads/:id/reassign') reassign(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const i = parse(reassign, b); return this.service.reassign(actorFromRequest(r), id, i.organizationId, i.reason); }
  @Post('admin/leads/:id/follow-up') followUp(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.generateFollowUp(actorFromRequest(r), id, parse(due, b).inactiveSince); }
}
