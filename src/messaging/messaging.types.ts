export type ActorType = 'PATIENT' | 'CLINICIAN' | 'SUPER_ADMIN' | 'SYSTEM_WORKER';
export type RiskCategory =
  | 'CONTACT_PHONE'
  | 'CONTACT_EMAIL'
  | 'EXTERNAL_CHANNEL'
  | 'EXTERNAL_URL'
  | 'PAYMENT_OR_IBAN'
  | 'OBFUSCATED_CONTACT'
  | 'SPAM_OR_ABUSE'
  | 'OTHER_CONFIGURED_KEYWORD';
export type RiskFlagStatus = 'OPEN' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'RESOLVED';
export type CaseType = 'COMPLAINT' | 'SUPPORT';
export type CaseStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type FollowUpTarget = 'PATIENT' | 'ORGANIZATION' | 'BOTH';
export type FollowUpAnswer = 'YES' | 'NO';
export type FollowUpStatus = 'OPEN' | 'ANSWERED' | 'CONFLICT' | 'REVIEW' | 'EXPIRED';

export interface Actor {
  id: string;
  type: ActorType;
  organizationId?: string;
  role?: string;
}

export interface Conversation {
  id: string;
  patientId: string;
  clinicianId: string;
  organizationId: string;
  leadId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  organizationId: string;
  clientRequestId: string;
  content: string;
  currentRevision: number;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRevision {
  id: string;
  messageId: string;
  revision: number;
  previousContent: string;
  newContent: string;
  editedBy: string;
  createdAt: string;
}

export interface ScreeningRule {
  id: string;
  version: number;
  category: RiskCategory;
  name: string;
  pattern?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RiskFlag {
  id: string;
  messageId: string;
  revisionId: string;
  conversationId: string;
  organizationId: string;
  ruleId: string;
  ruleVersion: number;
  category: RiskCategory;
  evidenceMasked: string;
  status: RiskFlagStatus;
  decisionReason?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ComplaintSupportCase {
  id: string;
  type: CaseType;
  category: string;
  description: string;
  conversationId: string;
  messageId?: string;
  leadId?: string;
  organizationId: string;
  openedBy: string;
  status: CaseStatus;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpAnswerRecord {
  answer: FollowUpAnswer;
  note?: string;
  answeredBy: string;
  answeredAt: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  conversationId: string;
  target: FollowUpTarget;
  dueAt: string;
  status: FollowUpStatus;
  answers: Partial<Record<'PATIENT' | 'ORGANIZATION', FollowUpAnswerRecord>>;
  createdAt: string;
  sentAt?: string;
}

export interface OrganizationNotice {
  id: string;
  sourceType: 'RISK_FLAG' | 'CASE';
  sourceId: string;
  organizationId: string;
  sendNotice: 'YES' | 'NO';
  status: 'NOT_SENT' | 'SENT' | 'FAILED';
  channel: 'IN_APP';
  attempts: number;
  createdAt: string;
  deliveredAt?: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  actorId: string;
  actorType: ActorType;
  organizationId?: string;
  entityType: string;
  entityId: string;
  revisionId?: string;
  requestId: string;
  metadata: Record<string, string | number | boolean | undefined>;
  createdAt: string;
}

export interface ParticipantMessageView {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  currentRevision: number;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}
