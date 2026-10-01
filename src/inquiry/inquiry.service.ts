import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { MessagingService } from '../messaging/messaging.service';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';
import { AssignmentState, Inquiry, InquiryState, Lead, LeadState } from '../platform/platform.types';

interface DraftInput { treatmentId: string; country: string; city?: string; summary: string; language: string; }

@Injectable()
export class InquiryService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore, @Inject(MessagingService) private readonly messaging: MessagingService) {}

  private patient(actor: Actor) { if (actor.type !== 'PATIENT') throw problem(403, 'FORBIDDEN', 'Patient access is required'); }
  private inquiry(id: string): Inquiry { const item = this.store.inquiries.get(id); if (!item) throw problem(404, 'INQUIRY_NOT_FOUND', 'Inquiry was not found'); return item; }
  private lead(id: string): Lead { const item = this.store.leads.get(id); if (!item) throw problem(404, 'LEAD_NOT_FOUND', 'Lead was not found'); return item; }
  private addTimeline(actor: Actor, inquiryId: string, leadId: string | undefined, from: string | undefined, to: string | undefined, reason: string | undefined, version: number, requestId = 'inquiry-request') {
    this.store.timeline.push({ id: this.store.id(), inquiryId, leadId, actorId: actor.id, from, to, reason, version, requestId, createdAt: this.store.now() });
  }
  private publicOrganization(id: string, treatmentId: string) {
    const organization = this.store.organizations.get(id); const treatment = this.store.treatments.get(treatmentId);
    if (!organization || !treatment || !organization.active || !organization.verified || organization.publication !== 'PUBLISHED' || !treatment.active || treatment.publication !== 'PUBLISHED' || !organization.treatmentIds.includes(treatmentId) || (organization.verificationExpiresAt && Date.parse(organization.verificationExpiresAt) <= Date.now())) return false;
    return true;
  }

  createDraft(actor: Actor, input: DraftInput): Inquiry {
    this.patient(actor); if (!this.store.treatments.has(input.treatmentId)) throw problem(404, 'TREATMENT_NOT_FOUND', 'Treatment was not found');
    const now = this.store.now(); const item: Inquiry = { ...input, id: this.store.id(), patientId: actor.id, selectedOrganizationIds: [], consentVersion: '', state: 'DRAFT', version: 1, createdAt: now, updatedAt: now };
    this.store.inquiries.set(item.id, item); return item;
  }

  updateDraft(actor: Actor, id: string, input: Partial<DraftInput>, expectedVersion: number): Inquiry {
    this.patient(actor); const item = this.inquiry(id); if (item.patientId !== actor.id) throw problem(403, 'FORBIDDEN', 'Inquiry does not belong to actor'); if (item.state !== 'DRAFT') throw problem(409, 'INQUIRY_NOT_DRAFT', 'Only draft inquiries can be updated'); if (item.version !== expectedVersion) throw problem(409, 'STALE_INQUIRY_VERSION', 'Inquiry version is stale');
    Object.assign(item, input, { version: item.version + 1, updatedAt: this.store.now() }); return item;
  }

  submit(actor: Actor, id: string, organizations: string[], consentVersion: string, idempotencyKey?: string): Inquiry {
    this.patient(actor); const item = this.inquiry(id); if (item.patientId !== actor.id) throw problem(403, 'FORBIDDEN', 'Inquiry does not belong to actor');
    if (idempotencyKey) { const previous = this.store.idempotency.get(this.store.key(actor.id, 'inquiry-submit', id, idempotencyKey)); if (previous) return this.inquiry(previous); }
    if (item.state !== 'DRAFT') throw problem(409, 'INQUIRY_NOT_DRAFT', 'Only draft inquiries can be submitted');
    if (organizations.length < 1 || organizations.length > 3 || new Set(organizations).size !== organizations.length) throw problem(422, 'INVALID_ORGANIZATION_SELECTION', 'Select one to three distinct organizations');
    const consent = this.store.consents.get(actor.id); if (!consent?.accepted || consent.version !== consentVersion) throw problem(403, 'GENERAL_CONSENT_REQUIRED', 'Current general consent is required');
    if (!this.store.treatments.has(item.treatmentId)) throw problem(422, 'TREATMENT_NOT_ELIGIBLE', 'Treatment is not eligible');
    if (organizations.some((organizationId) => !this.publicOrganization(organizationId, item.treatmentId))) throw problem(422, 'ORGANIZATION_NOT_ELIGIBLE', 'Every selected organization must be published, verified, active and treatment-eligible');
    const now = this.store.now(); item.selectedOrganizationIds = organizations; item.consentVersion = consentVersion; item.state = 'SUBMITTED'; item.version += 1; item.updatedAt = now;
    for (const organizationId of organizations) {
      const lead: Lead = { id: this.store.id(), inquiryId: item.id, organizationId, assignment: 'PENDING', state: 'NEW', version: 1, createdAt: now, updatedAt: now };
      this.store.leads.set(lead.id, lead);
      const grant = { id: this.store.id(), inquiryId: item.id, leadId: lead.id, patientId: actor.id, organizationId, allowedFields: ['treatmentId', 'country', 'city', 'summary', 'language'], attachmentRefs: [], active: true, version: 1, createdAt: now };
      this.store.grants.set(grant.id, grant); this.addTimeline(actor, item.id, lead.id, undefined, 'NEW', 'submit', lead.version);
    }
    if (idempotencyKey) this.store.idempotency.set(this.store.key(actor.id, 'inquiry-submit', id, idempotencyKey), item.id);
    return item;
  }

  cancel(actor: Actor, id: string, reason?: string) {
    this.patient(actor); const item = this.inquiry(id); if (item.patientId !== actor.id) throw problem(403, 'FORBIDDEN', 'Inquiry does not belong to actor');
    if (!['DRAFT', 'SUBMITTED', 'ACTIVE'].includes(item.state)) throw problem(409, 'INQUIRY_NOT_CANCELLABLE', 'Inquiry cannot be cancelled in its current state');
    const from = item.state; item.state = 'CANCELLED'; item.version += 1; item.updatedAt = this.store.now();
    for (const lead of this.store.leads.values()) if (lead.inquiryId === item.id) { lead.assignment = 'REVOKED'; lead.state = 'REVOKED'; lead.version += 1; for (const grant of this.store.grants.values()) if (grant.leadId === lead.id) grant.active = false; }
    this.addTimeline(actor, item.id, undefined, from, 'CANCELLED', reason, item.version); return this.projection(actor, item);
  }

  close(actor: Actor, id: string, reason?: string) {
    this.patient(actor); const item = this.inquiry(id); if (item.patientId !== actor.id) throw problem(403, 'FORBIDDEN', 'Inquiry does not belong to actor');
    const leads = [...this.store.leads.values()].filter((lead) => lead.inquiryId === item.id);
    if (!leads.length || leads.some((lead) => !['CLOSED_WON', 'CLOSED_LOST', 'REVOKED'].includes(lead.state))) throw problem(409, 'INQUIRY_NOT_CLOSABLE', 'All leads must be terminal before inquiry close');
    const from = item.state; item.state = 'CLOSED'; item.version += 1; item.updatedAt = this.store.now(); this.addTimeline(actor, item.id, undefined, from, 'CLOSED', reason, item.version); return this.projection(actor, item);
  }

  list(actor: Actor) {
    if (actor.type === 'PATIENT') return [...this.store.inquiries.values()].filter((item) => item.patientId === actor.id).map((item) => this.projection(actor, item));
    if (actor.type === 'SUPER_ADMIN') return [...this.store.inquiries.values()].map((item) => this.projection(actor, item));
    if (actor.organizationId) return [...this.store.inquiries.values()].map((item) => this.projection(actor, item)).filter((item) => item.leads.length > 0);
    throw problem(403, 'FORBIDDEN', 'Inquiry access is not available');
  }

  get(actor: Actor, id: string) { return this.projection(actor, this.inquiry(id)); }

  acceptAssignment(actor: Actor, leadId: string, expectedVersion: number, reason?: string) { return this.transitionAssignment(actor, leadId, 'ACCEPTED', expectedVersion, reason); }
  declineAssignment(actor: Actor, leadId: string, expectedVersion: number, reason?: string) { return this.transitionAssignment(actor, leadId, 'DECLINED', expectedVersion, reason); }
  private transitionAssignment(actor: Actor, leadId: string, target: AssignmentState, expectedVersion: number, reason?: string) {
    const lead = this.lead(leadId); this.requireOrganization(actor, lead); if (lead.version !== expectedVersion) throw problem(409, 'STALE_LEAD_VERSION', 'Lead version is stale');
    if (lead.assignment !== 'PENDING') throw problem(409, 'INVALID_ASSIGNMENT_TRANSITION', 'Assignment is no longer pending');
    const from = lead.assignment; lead.assignment = target; lead.state = target === 'ACCEPTED' ? 'ACCEPTED' : 'CLOSED_LOST'; lead.version += 1; lead.updatedAt = this.store.now(); this.addTimeline(actor, lead.inquiryId, lead.id, from, target, reason, lead.version); return lead;
  }

  transitionLead(actor: Actor, leadId: string, target: LeadState, expectedVersion: number, reason?: string, idempotencyKey?: string) {
    const lead = this.lead(leadId); if (idempotencyKey) { const previous = this.store.idempotency.get(this.store.key(actor.id, 'lead-transition', idempotencyKey)); if (previous) return this.lead(previous); }
    const inquiry = this.inquiry(lead.inquiryId); if (actor.type !== 'SUPER_ADMIN') this.requireOrganization(actor, lead); if (lead.version !== expectedVersion) throw problem(409, 'STALE_LEAD_VERSION', 'Lead version is stale');
    const allowed: Record<LeadState, LeadState[]> = { NEW: ['ACCEPTED'], ACCEPTED: ['IN_DISCUSSION'], IN_DISCUSSION: ['AWAITING_PATIENT', 'QUALIFIED', 'CLOSED_WON', 'CLOSED_LOST'], AWAITING_PATIENT: ['IN_DISCUSSION', 'QUALIFIED', 'CLOSED_WON', 'CLOSED_LOST'], QUALIFIED: ['CLOSED_WON', 'CLOSED_LOST'], CLOSED_WON: [], CLOSED_LOST: [], REVOKED: [] };
    if (!allowed[lead.state].includes(target)) throw problem(422, 'INVALID_LEAD_TRANSITION', 'Lead state transition is not allowed');
    const from = lead.state; lead.state = target; lead.version += 1; lead.updatedAt = this.store.now(); if (inquiry.state === 'SUBMITTED' && target !== 'NEW') inquiry.state = 'ACTIVE'; this.addTimeline(actor, inquiry.id, lead.id, from, target, reason, lead.version); if (idempotencyKey) this.store.idempotency.set(this.store.key(actor.id, 'lead-transition', idempotencyKey), lead.id); return lead;
  }

  revokeGrant(actor: Actor, leadId: string, reason?: string) {
    const lead = this.lead(leadId); const inquiry = this.inquiry(lead.inquiryId); if (actor.type !== 'SUPER_ADMIN' && (actor.type !== 'PATIENT' || actor.id !== inquiry.patientId)) throw problem(403, 'FORBIDDEN', 'Only the patient or super admin can revoke access');
    for (const grant of this.store.grants.values()) if (grant.leadId === lead.id) { grant.active = false; grant.version += 1; grant.revokedAt = this.store.now(); }
    const from = lead.state; lead.assignment = 'REVOKED'; lead.state = 'REVOKED'; lead.version += 1; lead.updatedAt = this.store.now(); this.addTimeline(actor, inquiry.id, lead.id, from, 'REVOKED', reason, lead.version); return lead;
  }

  reassign(actor: Actor, leadId: string, organizationId: string, reason: string) {
    if (actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Super admin access is required'); const old = this.lead(leadId); const inquiry = this.inquiry(old.inquiryId); if (!this.publicOrganization(organizationId, inquiry.treatmentId)) throw problem(422, 'ORGANIZATION_NOT_ELIGIBLE', 'Target organization is not eligible');
    old.assignment = 'REASSIGNED'; old.state = 'REVOKED'; old.version += 1; old.updatedAt = this.store.now(); const next: Lead = { id: this.store.id(), inquiryId: inquiry.id, organizationId, assignment: 'PENDING', state: 'NEW', version: 1, createdAt: this.store.now(), updatedAt: this.store.now() }; this.store.leads.set(next.id, next); const grant = { id: this.store.id(), inquiryId: inquiry.id, leadId: next.id, patientId: inquiry.patientId, organizationId, allowedFields: ['treatmentId', 'country', 'city', 'summary', 'language'], attachmentRefs: [], active: true, version: 1, createdAt: this.store.now() }; this.store.grants.set(grant.id, grant); this.addTimeline(actor, inquiry.id, old.id, 'REASSIGNED', 'REVOKED', reason, old.version); this.addTimeline(actor, inquiry.id, next.id, undefined, 'NEW', reason, next.version); return next;
  }

  async generateFollowUp(actor: Actor, leadId: string, inactiveSince: string) {
    const lead = this.lead(leadId); if (!['ACCEPTED', 'IN_DISCUSSION', 'AWAITING_PATIENT'].includes(lead.state)) throw problem(422, 'FOLLOW_UP_NOT_DUE', 'Lead state is not eligible for follow-up'); if (Date.now() - Date.parse(inactiveSince) < 7 * 86400000) throw problem(422, 'FOLLOW_UP_NOT_DUE', 'Lead must have seven days of meaningful inactivity');
    const result = this.messaging.createFollowUp({ actor, requestId: 'lead-follow-up' }, { leadId: lead.id, conversationId: `lead:${lead.id}`, target: 'BOTH', dueAt: this.store.now() }); return result;
  }

  private requireOrganization(actor: Actor, lead: Lead) {
    if (!actor.organizationId || actor.organizationId !== lead.organizationId || actor.type !== 'CLINICIAN') throw problem(403, 'FORBIDDEN', 'Organization assignment access is required');
    const membership = [...this.store.memberships.values()].find((item) => item.actorId === actor.id && item.organizationId === lead.organizationId && item.state === 'ACTIVE');
    if (!membership && !actor.role) throw problem(403, 'FORBIDDEN', 'Active organization membership is required');
    const role = membership?.role ?? actor.role;
    if (!['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'].includes(role ?? '')) throw problem(403, 'FORBIDDEN', 'Organization capability is required');
    if (role === 'VIEWER') throw problem(403, 'FORBIDDEN', 'Read-only organization members cannot mutate leads');
  }
  private projection(actor: Actor, inquiry: Inquiry) {
    if (actor.type === 'PATIENT' && actor.id !== inquiry.patientId) throw problem(403, 'FORBIDDEN', 'Inquiry does not belong to actor');
    const leads = [...this.store.leads.values()].filter((lead) => lead.inquiryId === inquiry.id && (actor.type === 'PATIENT' ? true : actor.type === 'SUPER_ADMIN' ? true : actor.organizationId === lead.organizationId && [...this.store.grants.values()].some((grant) => grant.leadId === lead.id && grant.active)));
    return { ...inquiry, leads: leads.map((lead) => ({ ...lead, grants: [...this.store.grants.values()].filter((grant) => grant.leadId === lead.id && (actor.type === 'PATIENT' || actor.type === 'SUPER_ADMIN' || grant.active)) })) };
  }
}
