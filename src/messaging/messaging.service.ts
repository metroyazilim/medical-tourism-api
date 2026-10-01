import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { actorFromRequest } from '../common/actor';
import { problem } from '../common/http';
import { MessagingStore } from './messaging.store';
import { ScreeningService } from './screening.service';
import {
  Actor,
  AuditEvent,
  CaseStatus,
  ComplaintSupportCase,
  Conversation,
  FollowUp,
  FollowUpAnswer,
  FollowUpTarget,
  Message,
  MessageRevision,
  OrganizationNotice,
  ParticipantMessageView,
  RiskFlag,
  RiskFlagStatus,
  ScreeningRule,
} from './messaging.types';

export interface RequestContext {
  actor: Actor;
  requestId: string;
}

export interface CreateConversationInput {
  patientId: string;
  clinicianId: string;
  organizationId: string;
  leadId?: string;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  clientRequestId: string;
}

export interface EditMessageInput {
  messageId: string;
  content: string;
  expectedRevision: number;
}

@Injectable()
export class MessagingService {
  constructor(
    @Inject(MessagingStore) private readonly store: MessagingStore,
    @Inject(ScreeningService) private readonly screening: ScreeningService,
  ) {}

  createConversation(ctx: RequestContext, input: CreateConversationInput): Conversation {
    if (ctx.actor.type !== 'PATIENT' && ctx.actor.type !== 'SUPER_ADMIN') {
      throw problem(403, 'FORBIDDEN', 'Only a patient or super admin can create a conversation');
    }
    if (ctx.actor.type === 'PATIENT' && ctx.actor.id !== input.patientId) {
      throw problem(403, 'FORBIDDEN', 'Conversation patient must match the authenticated actor');
    }
    const now = this.store.now();
    const conversation: Conversation = {
      id: this.store.id(),
      patientId: input.patientId,
      clinicianId: input.clinicianId,
      organizationId: input.organizationId,
      leadId: input.leadId,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.store.conversations.set(conversation.id, conversation);
    this.audit(ctx, 'CONVERSATION_CREATED', 'Conversation', conversation.id, { organizationId: input.organizationId });
    return conversation;
  }

  listConversations(ctx: RequestContext): Conversation[] {
    const all = [...this.store.conversations.values()];
    if (ctx.actor.type === 'SUPER_ADMIN') {
      return all;
    }
    return all.filter((conversation) => this.isParticipant(ctx.actor, conversation));
  }

  sendMessage(ctx: RequestContext, input: SendMessageInput): ParticipantMessageView {
    const conversation = this.conversation(input.conversationId);
    this.requireParticipant(ctx.actor, conversation);
    const requestKey = `${conversation.id}:${input.clientRequestId}`;
    const existingId = this.store.messageByRequest.get(requestKey);
    if (existingId) {
      const existing = this.store.messages.get(existingId);
      if (!existing) throw problem(500, 'INTERNAL_ERROR', 'Idempotency record is inconsistent');
      if (existing.content !== input.content) {
        throw problem(409, 'IDEMPOTENCY_CONFLICT', 'The client request ID was already used with a different payload');
      }
      return this.participantView(existing);
    }

    const now = this.store.now();
    const message: Message = {
      id: this.store.id(),
      conversationId: conversation.id,
      senderId: ctx.actor.id,
      organizationId: conversation.organizationId,
      clientRequestId: input.clientRequestId,
      content: input.content,
      currentRevision: 1,
      edited: false,
      createdAt: now,
      updatedAt: now,
    };
    const revision: MessageRevision = {
      id: this.store.id(),
      messageId: message.id,
      revision: 1,
      previousContent: '',
      newContent: input.content,
      editedBy: ctx.actor.id,
      createdAt: now,
    };
    this.store.messages.set(message.id, message);
    this.store.revisions.set(message.id, [revision]);
    this.store.messageByRequest.set(requestKey, message.id);
    conversation.updatedAt = now;
    this.audit(ctx, 'MESSAGE_CREATED', 'Message', message.id, { conversationId: conversation.id }, revision.id);
    this.scanAndStore(ctx, message, revision);
    return this.participantView(message);
  }

  editMessage(ctx: RequestContext, input: EditMessageInput): ParticipantMessageView {
    const message = this.message(input.messageId);
    const conversation = this.conversation(message.conversationId);
    this.requireParticipant(ctx.actor, conversation);
    if (message.senderId !== ctx.actor.id) {
      throw problem(403, 'FORBIDDEN', 'Only the message owner can edit a message');
    }
    if (message.currentRevision !== input.expectedRevision) {
      throw problem(409, 'STALE_MESSAGE_REVISION', 'Message revision is stale');
    }
    const now = this.store.now();
    const revision: MessageRevision = {
      id: this.store.id(),
      messageId: message.id,
      revision: message.currentRevision + 1,
      previousContent: message.content,
      newContent: input.content,
      editedBy: ctx.actor.id,
      createdAt: now,
    };
    message.content = input.content;
    message.currentRevision = revision.revision;
    message.edited = true;
    message.updatedAt = now;
    this.store.revisions.get(message.id)?.push(revision);
    conversation.updatedAt = now;
    this.audit(ctx, 'MESSAGE_EDITED', 'Message', message.id, { conversationId: conversation.id }, revision.id);
    this.scanAndStore(ctx, message, revision);
    return this.participantView(message);
  }

  listMessages(ctx: RequestContext, conversationId: string): ParticipantMessageView[] {
    const conversation = this.conversation(conversationId);
    this.requireParticipant(ctx.actor, conversation);
    return [...this.store.messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((message) => this.participantView(message));
  }

  adminRevisions(ctx: RequestContext, conversationId: string): Array<{ message: Message; revisions: MessageRevision[] }> {
    this.requireAdmin(ctx.actor);
    const conversation = this.conversation(conversationId);
    const result = [...this.store.messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .map((message) => ({ message: { ...message }, revisions: this.store.revisionsFor(message.id).map((item) => ({ ...item })) }));
    this.audit(ctx, 'ADMIN_REVISIONS_VIEWED', 'Conversation', conversation.id, { revisionCount: result.reduce((sum, item) => sum + item.revisions.length, 0) });
    return result;
  }

  listRules(ctx: RequestContext): ScreeningRule[] {
    this.requireAdmin(ctx.actor);
    return this.store.rules();
  }

  createRule(ctx: RequestContext, input: Omit<ScreeningRule, 'id' | 'createdAt' | 'updatedAt'>): ScreeningRule {
    this.requireAdmin(ctx.actor);
    if (input.category !== 'OTHER_CONFIGURED_KEYWORD' || !input.pattern?.trim()) {
      throw problem(422, 'INVALID_SCREENING_RULE', 'Custom screening rules require category OTHER_CONFIGURED_KEYWORD and a pattern');
    }
    const now = this.store.now();
    const rule: ScreeningRule = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.store.screeningRules.set(rule.id, rule);
    this.audit(ctx, 'SCREENING_RULE_CREATED', 'ScreeningRule', rule.id, { category: rule.category, version: rule.version });
    return rule;
  }

  updateRule(ctx: RequestContext, id: string, input: Partial<Pick<ScreeningRule, 'enabled' | 'pattern' | 'name'>>): ScreeningRule {
    this.requireAdmin(ctx.actor);
    const rule = this.store.screeningRules.get(id);
    if (!rule) throw problem(404, 'SCREENING_RULE_NOT_FOUND', 'Screening rule was not found');
    Object.assign(rule, input, { version: rule.version + 1, updatedAt: this.store.now() });
    this.audit(ctx, 'SCREENING_RULE_UPDATED', 'ScreeningRule', rule.id, { version: rule.version, enabled: rule.enabled });
    return rule;
  }

  listFlags(ctx: RequestContext): RiskFlag[] {
    this.requireAdmin(ctx.actor);
    return [...this.store.riskFlags.values()];
  }

  getFlag(ctx: RequestContext, id: string): RiskFlag {
    this.requireAdmin(ctx.actor);
    const flag = this.store.riskFlags.get(id);
    if (!flag) throw problem(404, 'RISK_FLAG_NOT_FOUND', 'Risk flag was not found');
    return flag;
  }

  decideFlag(ctx: RequestContext, id: string, status: RiskFlagStatus, reason: string): RiskFlag {
    this.requireAdmin(ctx.actor);
    const flag = this.getFlag(ctx, id);
    flag.status = status;
    flag.decisionReason = reason;
    flag.decidedBy = ctx.actor.id;
    flag.decidedAt = this.store.now();
    this.audit(ctx, 'RISK_FLAG_DECIDED', 'RiskFlag', id, { status });
    return flag;
  }

  createCase(ctx: RequestContext, input: Omit<ComplaintSupportCase, 'id' | 'openedBy' | 'status' | 'createdAt' | 'updatedAt' | 'organizationId'>): ComplaintSupportCase {
    const conversation = this.conversation(input.conversationId);
    this.requireParticipant(ctx.actor, conversation);
    const now = this.store.now();
    const item: ComplaintSupportCase = {
      ...input,
      id: this.store.id(),
      openedBy: ctx.actor.id,
      organizationId: conversation.organizationId,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    };
    this.store.cases.set(item.id, item);
    this.audit(ctx, 'CASE_CREATED', 'ComplaintSupportCase', item.id, { caseType: item.type });
    return item;
  }

  listCases(ctx: RequestContext): ComplaintSupportCase[] {
    this.requireAdmin(ctx.actor);
    return [...this.store.cases.values()];
  }

  getCase(ctx: RequestContext, id: string): ComplaintSupportCase {
    this.requireAdmin(ctx.actor);
    const item = this.store.cases.get(id);
    if (!item) throw problem(404, 'CASE_NOT_FOUND', 'Complaint/support case was not found');
    return item;
  }

  updateCase(ctx: RequestContext, id: string, status: CaseStatus, resolutionNote?: string): ComplaintSupportCase {
    this.requireAdmin(ctx.actor);
    const item = this.store.cases.get(id);
    if (!item) throw problem(404, 'CASE_NOT_FOUND', 'Complaint/support case was not found');
    if (item.status === 'CLOSED') throw problem(409, 'CASE_CLOSED', 'Closed cases cannot be changed');
    item.status = status;
    item.resolutionNote = resolutionNote;
    item.updatedAt = this.store.now();
    this.audit(ctx, status === 'RESOLVED' ? 'CASE_RESOLVED' : 'CASE_STATUS_CHANGED', 'ComplaintSupportCase', id, { status });
    return item;
  }

  createFollowUp(ctx: RequestContext, input: Omit<FollowUp, 'id' | 'createdAt' | 'status' | 'answers' | 'sentAt'>): FollowUp {
    this.requireAdminOrWorker(ctx.actor);
    const existing = [...this.store.followUps.values()].find(
      (item) => item.leadId === input.leadId && item.status === 'OPEN',
    );
    if (existing) return existing;
    const followUp: FollowUp = {
      ...input,
      id: this.store.id(),
      status: 'OPEN',
      answers: {},
      createdAt: this.store.now(),
      sentAt: this.store.now(),
    };
    this.store.followUps.set(followUp.id, followUp);
    this.audit(ctx, 'FOLLOW_UP_CREATED', 'FollowUp', followUp.id, { target: followUp.target });
    this.audit(ctx, 'FOLLOW_UP_SENT', 'FollowUp', followUp.id, { target: followUp.target });
    return followUp;
  }

  listFollowUps(ctx: RequestContext): FollowUp[] {
    this.requireAdmin(ctx.actor);
    return [...this.store.followUps.values()];
  }

  answerFollowUp(ctx: RequestContext, id: string, answer: FollowUpAnswer, note?: string): FollowUp {
    const followUp = this.store.followUps.get(id);
    if (!followUp) throw problem(404, 'FOLLOW_UP_NOT_FOUND', 'Follow-up was not found');
    const conversation = this.conversation(followUp.conversationId);
    let side: 'PATIENT' | 'ORGANIZATION';
    if (ctx.actor.type === 'PATIENT' && ctx.actor.id === conversation.patientId) side = 'PATIENT';
    else if (ctx.actor.type === 'CLINICIAN' && ctx.actor.organizationId === conversation.organizationId) side = 'ORGANIZATION';
    else throw problem(403, 'FORBIDDEN', 'Actor is not a follow-up recipient');
    if ((followUp.target === 'PATIENT' && side !== 'PATIENT') || (followUp.target === 'ORGANIZATION' && side !== 'ORGANIZATION')) {
      throw problem(403, 'FORBIDDEN', 'Actor is not included in this follow-up target');
    }
    const now = this.store.now();
    followUp.answers[side] = { answer, note, answeredBy: ctx.actor.id, answeredAt: now };
    const patientAnswer = followUp.answers.PATIENT?.answer;
    const organizationAnswer = followUp.answers.ORGANIZATION?.answer;
    if (patientAnswer && organizationAnswer) {
      followUp.status = patientAnswer === organizationAnswer ? 'ANSWERED' : 'CONFLICT';
      if (followUp.status === 'CONFLICT') this.audit(ctx, 'FOLLOW_UP_CONFLICTED', 'FollowUp', id, {});
    }
    this.audit(ctx, 'FOLLOW_UP_ANSWERED', 'FollowUp', id, { side, answer });
    return followUp;
  }

  decideNotice(ctx: RequestContext, input: { sourceType: 'RISK_FLAG' | 'CASE'; sourceId: string; organizationId?: string; sendNotice: 'YES' | 'NO' }): OrganizationNotice {
    this.requireAdmin(ctx.actor);
    const sourceOrganizationId = input.sourceType === 'RISK_FLAG'
      ? this.store.riskFlags.get(input.sourceId)?.organizationId
      : this.store.cases.get(input.sourceId)?.organizationId;
    if (input.sourceType === 'RISK_FLAG' && !sourceOrganizationId) throw problem(404, 'RISK_FLAG_NOT_FOUND', 'Risk flag was not found');
    if (input.sourceType === 'CASE' && !sourceOrganizationId) throw problem(404, 'CASE_NOT_FOUND', 'Complaint/support case was not found');
    if (input.sendNotice === 'YES' && !input.organizationId) throw problem(422, 'ORGANIZATION_REQUIRED', 'organizationId is required when sendNotice is YES');
    if (input.sendNotice === 'YES' && input.organizationId !== sourceOrganizationId) throw problem(403, 'FORBIDDEN', 'Notice organization must match the source organization');
    const organizationId = input.organizationId ?? 'none';
    const existing = [...this.store.notices.values()].find(
      (notice) => notice.sourceType === input.sourceType && notice.sourceId === input.sourceId && notice.organizationId === organizationId && notice.sendNotice === input.sendNotice,
    );
    if (existing) return existing;
    const now = this.store.now();
    const notice: OrganizationNotice = {
      id: this.store.id(),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      organizationId,
      sendNotice: input.sendNotice,
      status: input.sendNotice === 'YES' ? 'SENT' : 'NOT_SENT',
      channel: 'IN_APP',
      attempts: input.sendNotice === 'YES' ? 1 : 0,
      createdAt: now,
      deliveredAt: input.sendNotice === 'YES' ? now : undefined,
    };
    this.store.notices.set(notice.id, notice);
    this.audit(ctx, 'ORGANIZATION_NOTICE_DECIDED', 'OrganizationNotice', notice.id, { sendNotice: input.sendNotice });
    if (input.sendNotice === 'YES') this.audit(ctx, 'ORGANIZATION_NOTICE_SENT', 'OrganizationNotice', notice.id, { channel: notice.channel });
    return notice;
  }

  getNotice(ctx: RequestContext, id: string): OrganizationNotice {
    this.requireAdmin(ctx.actor);
    const notice = this.store.notices.get(id);
    if (!notice) throw problem(404, 'NOTICE_NOT_FOUND', 'Organization notice was not found');
    return notice;
  }

  retryNotice(ctx: RequestContext, id: string): OrganizationNotice {
    this.requireAdmin(ctx.actor);
    const notice = this.getNotice(ctx, id);
    if (notice.sendNotice === 'NO' || notice.status === 'SENT') return notice;
    notice.attempts += 1;
    notice.status = 'SENT';
    notice.deliveredAt = this.store.now();
    this.audit(ctx, 'ORGANIZATION_NOTICE_SENT', 'OrganizationNotice', id, { attempt: notice.attempts });
    return notice;
  }

  listAudits(ctx: RequestContext): AuditEvent[] {
    this.requireAdmin(ctx.actor);
    return [...this.store.audits];
  }

  private scanAndStore(ctx: RequestContext, message: Message, revision: MessageRevision): void {
    for (const match of this.screening.scan(message.content, this.store.rules())) {
      if (this.store.flagsForMessage(message.id, revision.id, match.rule.id)) continue;
      const flag: RiskFlag = {
        id: this.store.id(),
        messageId: message.id,
        revisionId: revision.id,
        conversationId: message.conversationId,
        organizationId: message.organizationId,
        ruleId: match.rule.id,
        ruleVersion: match.rule.version,
        category: match.rule.category,
        evidenceMasked: match.evidenceMasked,
        status: 'OPEN',
        createdAt: this.store.now(),
      };
      this.store.riskFlags.set(flag.id, flag);
      this.audit({ actor: { id: 'system-screening', type: 'SYSTEM_WORKER' }, requestId: ctx.requestId }, 'RISK_FLAG_CREATED', 'RiskFlag', flag.id, { category: flag.category }, revision.id);
    }
  }

  private audit(ctx: RequestContext, eventType: string, entityType: string, entityId: string, metadata: Record<string, string | number | boolean | undefined>, revisionId?: string): void {
    const event: AuditEvent = {
      id: this.store.id(),
      eventType,
      actorId: ctx.actor.id,
      actorType: ctx.actor.type,
      organizationId: ctx.actor.organizationId,
      entityType,
      entityId,
      revisionId,
      requestId: ctx.requestId,
      metadata,
      createdAt: this.store.now(),
    };
    this.store.audits.push(event);
  }

  private requireAdmin(actor: Actor): void {
    if (actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Super admin access is required');
  }

  private requireAdminOrWorker(actor: Actor): void {
    if (actor.type !== 'SUPER_ADMIN' && actor.type !== 'SYSTEM_WORKER') {
      throw problem(403, 'FORBIDDEN', 'Super admin or system worker access is required');
    }
  }

  private requireParticipant(actor: Actor, conversation: Conversation): void {
    if (!this.isParticipant(actor, conversation)) throw problem(403, 'FORBIDDEN', 'Actor is not a conversation participant');
  }

  private isParticipant(actor: Actor, conversation: Conversation): boolean {
    return (actor.type === 'PATIENT' && actor.id === conversation.patientId)
      || (actor.type === 'CLINICIAN' && actor.organizationId === conversation.organizationId && actor.id === conversation.clinicianId);
  }

  private conversation(id: string): Conversation {
    const conversation = this.store.conversations.get(id);
    if (!conversation) throw problem(404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found');
    return conversation;
  }

  private message(id: string): Message {
    const message = this.store.messages.get(id);
    if (!message) throw problem(404, 'MESSAGE_NOT_FOUND', 'Message was not found');
    return message;
  }

  private participantView(message: Message): ParticipantMessageView {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      currentRevision: message.currentRevision,
      edited: message.edited,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
