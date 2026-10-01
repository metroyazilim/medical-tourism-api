import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { defaultScreeningRules } from './screening.service';
import {
  AuditEvent,
  ComplaintSupportCase,
  Conversation,
  FollowUp,
  Message,
  MessageRevision,
  OrganizationNotice,
  RiskFlag,
  ScreeningRule,
} from './messaging.types';

@Injectable()
export class MessagingStore {
  readonly conversations = new Map<string, Conversation>();
  readonly messages = new Map<string, Message>();
  readonly revisions = new Map<string, MessageRevision[]>();
  readonly screeningRules = new Map<string, ScreeningRule>();
  readonly riskFlags = new Map<string, RiskFlag>();
  readonly cases = new Map<string, ComplaintSupportCase>();
  readonly followUps = new Map<string, FollowUp>();
  readonly notices = new Map<string, OrganizationNotice>();
  readonly audits: AuditEvent[] = [];
  readonly messageByRequest = new Map<string, string>();

  constructor() {
    for (const rule of defaultScreeningRules()) {
      this.screeningRules.set(rule.id, rule);
    }
  }

  id(): string {
    return randomUUID();
  }

  now(): string {
    return new Date().toISOString();
  }

  rules(): ScreeningRule[] {
    return [...this.screeningRules.values()];
  }

  revisionsFor(messageId: string): MessageRevision[] {
    return this.revisions.get(messageId) ?? [];
  }

  flagsForMessage(messageId: string, revisionId: string, ruleId: string): RiskFlag | undefined {
    return [...this.riskFlags.values()].find(
      (flag) => flag.messageId === messageId && flag.revisionId === revisionId && flag.ruleId === ruleId,
    );
  }
}
