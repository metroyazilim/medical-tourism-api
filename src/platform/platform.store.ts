import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccountDeletionRequest, Appointment, Attachment, ConsentRecord, Doctor, Favorite, Inquiry, JourneyEvent, Lead, Membership, Notification, NotificationPreference, Organization, OperationsCheck, PatientPreferences, PatientProfile, PlatformAuditEvent, PrivacyRequest, Quote, AccessGrant, Session, TimelineEvent, Treatment } from './platform.types';

@Injectable()
export class PlatformStore {
  readonly consents = new Map<string, ConsentRecord>();
  readonly sessions = new Map<string, Session>();
  readonly deletionRequests = new Map<string, AccountDeletionRequest>();
  readonly privacyRequests = new Map<string, PrivacyRequest>();
  readonly memberships = new Map<string, Membership>();
  readonly profiles = new Map<string, PatientProfile>();
  readonly preferences = new Map<string, PatientPreferences>();
  readonly organizations = new Map<string, Organization>();
  readonly doctors = new Map<string, Doctor>();
  readonly treatments = new Map<string, Treatment>();
  readonly favorites = new Map<string, Favorite>();
  readonly inquiries = new Map<string, Inquiry>();
  readonly leads = new Map<string, Lead>();
  readonly grants = new Map<string, AccessGrant>();
  readonly timeline: TimelineEvent[] = [];
  readonly attachments = new Map<string, Attachment>();
  readonly quotes = new Map<string, Quote>();
  readonly appointments = new Map<string, Appointment>();
  readonly journey: JourneyEvent[] = [];
  readonly notifications = new Map<string, Notification>();
  readonly notificationPreferences = new Map<string, NotificationPreference>();
  readonly platformAudits: PlatformAuditEvent[] = [];
  readonly operationsChecks = new Map<string, OperationsCheck>();
  readonly idempotency = new Map<string, string>();

  id(): string { return randomUUID(); }
  now(): string { return new Date().toISOString(); }
  key(...parts: string[]): string { return parts.join(':'); }
}
