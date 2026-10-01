export type PublicationState = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'VERIFIED' | 'PUBLISHED' | 'SUSPENDED' | 'EXPIRED';
export type MembershipState = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
export type InquiryState = 'DRAFT' | 'SUBMITTED' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type LeadState = 'NEW' | 'ACCEPTED' | 'IN_DISCUSSION' | 'AWAITING_PATIENT' | 'QUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST' | 'REVOKED';
export type AssignmentState = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'REASSIGNED';

export interface ConsentRecord { actorId: string; version: string; accepted: boolean; locale?: string; updatedAt: string; }
export interface Session { id: string; actorId: string; provider: string; createdAt: string; revokedAt?: string; }
export type DeletionState = 'REQUESTED' | 'CANCELLED' | 'ANONYMIZED';
export interface AccountDeletionRequest { id: string; actorId: string; state: DeletionState; requestedAt: string; updatedAt: string; }
export interface Membership { id: string; actorId: string; organizationId: string; role: string; state: MembershipState; createdAt: string; }
export interface PatientProfile { patientId: string; displayName?: string; country?: string; locale?: string; currency?: string; completion: 'EMPTY' | 'PARTIAL' | 'READY'; fields: Record<string, string>; updatedAt: string; }
export interface PatientPreferences { patientId: string; locale?: string; currency?: string; contact: Record<string, 'IN_APP' | 'EMAIL' | 'PUSH'>; updatedAt: string; }
export interface Organization { id: string; name: string; country: string; city?: string; languages: string[]; treatmentIds: string[]; publication: PublicationState; verified: boolean; active: boolean; verificationExpiresAt?: string; updatedAt: string; }
export interface Doctor { id: string; name: string; specialties: string[]; organizationIds: string[]; publication: PublicationState; verified: boolean; active: boolean; updatedAt: string; }
export interface Treatment { id: string; name: string; category: string; locales: string[]; publication: PublicationState; active: boolean; updatedAt: string; }
export interface Favorite { patientId: string; entityType: 'organization' | 'doctor' | 'treatment'; entityId: string; createdAt: string; }
export interface TimelineEvent { id: string; inquiryId: string; leadId?: string; actorId: string; from?: string; to?: string; reason?: string; version: number; requestId: string; createdAt: string; }
export interface Inquiry { id: string; patientId: string; treatmentId: string; country: string; city?: string; summary: string; language: string; selectedOrganizationIds: string[]; consentVersion: string; state: InquiryState; version: number; createdAt: string; updatedAt: string; }
export interface Lead { id: string; inquiryId: string; organizationId: string; assignment: AssignmentState; state: LeadState; version: number; createdAt: string; updatedAt: string; }
export interface AccessGrant { id: string; inquiryId: string; leadId: string; patientId: string; organizationId: string; allowedFields: string[]; attachmentRefs: string[]; active: boolean; version: number; createdAt: string; revokedAt?: string; }
export type AttachmentState = 'PENDING_SCAN' | 'AVAILABLE' | 'QUARANTINED' | 'REJECTED' | 'DELETED';
export type AttachmentContext = 'INQUIRY' | 'LEAD' | 'MESSAGE' | 'VERIFICATION';
export interface Attachment { id: string; ownerId: string; contextType: AttachmentContext; contextId: string; leadId?: string; inquiryId?: string; filename: string; mimeType: string; size: number; checksum: string; storageKey: string; state: AttachmentState; version: number; idempotencyKey?: string; createdAt: string; scannedAt?: string; deletedAt?: string; }
export type QuoteState = 'DRAFT' | 'PUBLISHED' | 'EXPIRED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export interface QuoteItem { id: string; description: string; quantity: number; amountMinor: number; included: boolean; }
export interface Quote { id: string; leadId: string; inquiryId: string; organizationId: string; currency: string; items: QuoteItem[]; validityEnd: string; state: QuoteState; version: number; createdAt: string; updatedAt: string; publishedAt?: string; decidedAt?: string; decisionReason?: string; }
export type AppointmentState = 'PROPOSED' | 'CONFIRMED' | 'RESCHEDULE_REQUESTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export interface Appointment { id: string; leadId: string; inquiryId: string; organizationId: string; patientId: string; startAt: string; endAt: string; timeZone: string; state: AppointmentState; version: number; createdAt: string; updatedAt: string; reason?: string; }
export interface JourneyEvent { id: string; leadId: string; inquiryId: string; eventType: string; actorId: string; appointmentId?: string; quoteId?: string; reason?: string; version: number; createdAt: string; }
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH';
export type NotificationStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'READ' | 'CANCELLED';
export interface Notification { id: string; recipientId: string; category: string; channel: NotificationChannel; template: string; sourceType: string; sourceId: string; status: NotificationStatus; attempts: number; idempotencyKey: string; createdAt: string; sentAt?: string; readAt?: string; failedAt?: string; }
export interface NotificationPreference { actorId: string; channels: Record<string, NotificationChannel[]>; updatedAt: string; }
export type PrivacyRequestState = 'REQUESTED' | 'CANCELLED' | 'ANONYMIZED';
export interface PrivacyRequest { id: string; actorId: string; state: PrivacyRequestState; policyVersion: string; requestedAt: string; updatedAt: string; }
export interface PlatformAuditEvent { id: string; actorId: string; actorType: string; action: string; entityType: string; entityId: string; requestId: string; metadata: Record<string, string | number | boolean | undefined>; createdAt: string; }
export interface OperationsCheck { name: string; status: 'READY' | 'NOT_CONFIGURED' | 'NOT_READY'; detailCode: string; observedAt: string; }
