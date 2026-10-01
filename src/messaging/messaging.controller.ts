import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse, requestId } from '../common/http';
import { MessagingService, RequestContext } from './messaging.service';
import { CaseStatus, FollowUpAnswer, RiskFlagStatus } from './messaging.types';

const idParam = z.object({ id: z.string().min(1) });
const conversationParam = z.object({ conversationId: z.string().min(1) });
const createConversation = z.object({
  patientId: z.string().min(1),
  clinicianId: z.string().min(1),
  organizationId: z.string().min(1),
  leadId: z.string().min(1).optional(),
});
const sendMessage = z.object({
  content: z.string().trim().min(1).max(10000),
  clientRequestId: z.string().trim().min(1).max(200),
});
const editMessage = z.object({
  content: z.string().trim().min(1).max(10000),
  expectedRevision: z.number().int().positive(),
});
const rule = z.object({
  version: z.number().int().positive(),
  category: z.literal('OTHER_CONFIGURED_KEYWORD'),
  name: z.string().trim().min(1).max(120),
  pattern: z.string().trim().min(1).max(200),
  enabled: z.boolean().default(true),
});
const ruleUpdate = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  pattern: z.string().trim().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
});
const flagDecision = z.object({
  status: z.enum(['CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED']),
  reason: z.string().trim().min(1).max(1000),
});
const caseBody = z.object({
  type: z.enum(['COMPLAINT', 'SUPPORT']),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(5000),
  messageId: z.string().min(1).optional(),
  leadId: z.string().min(1).optional(),
});
const caseUpdate = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED']),
  resolutionNote: z.string().trim().max(2000).optional(),
});
const followUpBody = z.object({
  leadId: z.string().min(1),
  conversationId: z.string().min(1),
  target: z.enum(['PATIENT', 'ORGANIZATION', 'BOTH']),
  dueAt: z.string().datetime(),
});
const answerBody = z.object({
  answer: z.enum(['YES', 'NO']),
  note: z.string().trim().max(1000).optional(),
});
const noticeBody = z.object({
  sourceType: z.enum(['RISK_FLAG', 'CASE']),
  sourceId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  sendNotice: z.enum(['YES', 'NO']),
});

@Controller('api/v1')
export class MessagingController {
  constructor(@Inject(MessagingService) private readonly service: MessagingService) {}

  @Post('conversations')
  createConversation(@Req() request: FastifyRequest, @Body() body: unknown) {
    return this.service.createConversation(this.context(request), parse(createConversation, body));
  }

  @Get('conversations')
  listConversations(@Req() request: FastifyRequest) {
    return this.service.listConversations(this.context(request));
  }

  @Post('conversations/:conversationId/messages')
  sendMessage(@Req() request: FastifyRequest, @Param() params: unknown, @Body() body: unknown) {
    const input = parse(sendMessage, body);
    return this.service.sendMessage(this.context(request), { ...input, conversationId: parse(conversationParam, params).conversationId });
  }

  @Get('conversations/:conversationId/messages')
  listMessages(@Req() request: FastifyRequest, @Param() params: unknown) {
    return this.service.listMessages(this.context(request), parse(conversationParam, params).conversationId);
  }

  @Patch('messages/:id')
  editMessage(@Req() request: FastifyRequest, @Param() params: unknown, @Body() body: unknown) {
    return this.service.editMessage(this.context(request), { ...parse(editMessage, body), messageId: parse(idParam, params).id });
  }

  @Get('admin/conversations/:id/revisions')
  adminRevisions(@Req() request: FastifyRequest, @Param() params: unknown) {
    return this.service.adminRevisions(this.context(request), parse(idParam, params).id);
  }

  @Get('admin/screening-rules')
  listRules(@Req() request: FastifyRequest) {
    return this.service.listRules(this.context(request));
  }

  @Post('admin/screening-rules')
  createRule(@Req() request: FastifyRequest, @Body() body: unknown) {
    return this.service.createRule(this.context(request), parse(rule, body));
  }

  @Patch('admin/screening-rules/:id')
  updateRule(@Req() request: FastifyRequest, @Param() params: unknown, @Body() body: unknown) {
    return this.service.updateRule(this.context(request), parse(idParam, params).id, parse(ruleUpdate, body));
  }

  @Get('admin/risk-flags')
  listFlags(@Req() request: FastifyRequest) {
    return this.service.listFlags(this.context(request));
  }

  @Get('admin/risk-flags/:id')
  getFlag(@Req() request: FastifyRequest, @Param() params: unknown) {
    return this.service.getFlag(this.context(request), parse(idParam, params).id);
  }

  @Patch('admin/risk-flags/:id/decision')
  decideFlag(@Req() request: FastifyRequest, @Param() params: unknown, @Body() body: unknown) {
    const input = parse(flagDecision, body);
    return this.service.decideFlag(this.context(request), parse(idParam, params).id, input.status as RiskFlagStatus, input.reason);
  }

  @Post('conversations/:conversationId/cases')
  createCase(@Req() request: FastifyRequest, @Param() params: unknown, @Body() body: unknown) {
    return this.service.createCase(this.context(request), {
      ...parse(caseBody, body),
      conversationId: parse(conversationParam, params).conversationId,
    });
  }

  @Get('admin/cases')
  listCases(@Req() request: FastifyRequest) {
    return this.service.listCases(this.context(request));
  }

  @Get('admin/cases/:id')
  getCase(@Req() request: FastifyRequest, @Param() params: unknown) {
    return this.service.getCase(this.context(request), parse(idParam, params).id);
  }

  @Patch('admin/cases/:id')
  updateCase(@Req() request: FastifyRequest, @Param() params: unknown, @Body() body: unknown) {
    const input = parse(caseUpdate, body);
    return this.service.updateCase(this.context(request), parse(idParam, params).id, input.status as CaseStatus, input.resolutionNote);
  }

  @Post('admin/follow-ups')
  createFollowUp(@Req() request: FastifyRequest, @Body() body: unknown) {
    return this.service.createFollowUp(this.context(request), parse(followUpBody, body));
  }

  @Get('admin/follow-ups')
  listFollowUps(@Req() request: FastifyRequest) {
    return this.service.listFollowUps(this.context(request));
  }

  @Post('follow-ups/:id/answers')
  answerFollowUp(@Req() request: FastifyRequest, @Param() params: unknown, @Body() body: unknown) {
    const input = parse(answerBody, body);
    return this.service.answerFollowUp(this.context(request), parse(idParam, params).id, input.answer as FollowUpAnswer, input.note);
  }

  @Post('admin/notices/decision')
  decideNotice(@Req() request: FastifyRequest, @Body() body: unknown) {
    return this.service.decideNotice(this.context(request), parse(noticeBody, body));
  }

  @Get('admin/notices/:id')
  getNotice(@Req() request: FastifyRequest, @Param() params: unknown) {
    return this.service.getNotice(this.context(request), parse(idParam, params).id);
  }

  @Post('admin/notices/:id/retry')
  retryNotice(@Req() request: FastifyRequest, @Param() params: unknown) {
    return this.service.retryNotice(this.context(request), parse(idParam, params).id);
  }

  @Get('admin/audit-events')
  listAudits(@Req() request: FastifyRequest) {
    return this.service.listAudits(this.context(request));
  }

  private context(request: FastifyRequest): RequestContext {
    return { actor: actorFromRequest(request), requestId: requestId(request) };
  }
}
