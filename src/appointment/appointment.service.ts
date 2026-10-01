import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';
import { Appointment, AppointmentState } from '../platform/platform.types';

@Injectable()
export class AppointmentService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}
  private access(actor: Actor, leadId: string, mutate = false) {
    const lead = this.store.leads.get(leadId); if (!lead || lead.state === 'REVOKED') throw problem(404, 'LEAD_NOT_FOUND', 'Lead was not found'); const inquiry = this.store.inquiries.get(lead.inquiryId); if (!inquiry) throw problem(404, 'INQUIRY_NOT_FOUND', 'Inquiry was not found'); if (actor.type === 'SUPER_ADMIN') return { lead, inquiry, member: undefined }; if (actor.type === 'PATIENT' && actor.id === inquiry.patientId) return { lead, inquiry, member: undefined }; const member = [...this.store.memberships.values()].find((item) => item.actorId === actor.id && item.organizationId === lead.organizationId && item.state === 'ACTIVE'); const grant = [...this.store.grants.values()].some((item) => item.leadId === lead.id && item.active); if (actor.type === 'CLINICIAN' && member && grant && (!mutate || member.role !== 'VIEWER')) return { lead, inquiry, member }; throw problem(403, 'FORBIDDEN', 'Lead appointment access is not available');
  }
  private appointment(actor: Actor, id: string) { const item = this.store.appointments.get(id); if (!item) throw problem(404, 'APPOINTMENT_NOT_FOUND', 'Appointment was not found'); this.access(actor, item.leadId); return item; }
  private zone(value: string) { try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); } catch { throw problem(422, 'INVALID_TIMEZONE', 'timeZone must be a valid IANA timezone'); } }
  private dates(startAt: string, endAt: string) { const start = Date.parse(startAt); const end = Date.parse(endAt); if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw problem(422, 'INVALID_APPOINTMENT_TIME', 'endAt must be after startAt'); return { start, end }; }
  private audit(actor: Actor, action: string, id: string) { this.store.platformAudits.push({ id: this.store.id(), actorId: actor.id, actorType: actor.type, action, entityType: 'Appointment', entityId: id, requestId: 'appointment-request', metadata: {}, createdAt: this.store.now() }); }
  private journey(actor: Actor, item: Appointment, eventType: string, reason?: string) { this.store.journey.push({ id: this.store.id(), leadId: item.leadId, inquiryId: item.inquiryId, eventType, actorId: actor.id, appointmentId: item.id, reason, version: item.version, createdAt: this.store.now() }); }

  create(actor: Actor, leadId: string, input: { startAt: string; endAt: string; timeZone: string }) {
    const { lead, inquiry } = this.access(actor, leadId, true); this.zone(input.timeZone); const times = this.dates(input.startAt, input.endAt);
    const overlap = [...this.store.appointments.values()].some((item) => item.leadId === lead.id && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(item.state) && times.start < Date.parse(item.endAt) && times.end > Date.parse(item.startAt)); if (overlap) throw problem(409, 'APPOINTMENT_OVERLAP', 'Appointment overlaps an existing active appointment');
    const now = this.store.now(); const item: Appointment = { id: this.store.id(), leadId, inquiryId: inquiry.id, organizationId: lead.organizationId, patientId: inquiry.patientId, startAt: new Date(times.start).toISOString(), endAt: new Date(times.end).toISOString(), timeZone: input.timeZone, state: 'PROPOSED', version: 1, createdAt: now, updatedAt: now }; this.store.appointments.set(item.id, item); this.journey(actor, item, 'APPOINTMENT_PROPOSED'); this.audit(actor, 'APPOINTMENT_CREATED', item.id); return item;
  }
  list(actor: Actor, leadId: string) { this.access(actor, leadId); return [...this.store.appointments.values()].filter((item) => item.leadId === leadId); }
  transition(actor: Actor, id: string, target: AppointmentState, expectedVersion: number, input?: { startAt?: string; endAt?: string; timeZone?: string; reason?: string }) {
    const item = this.appointment(actor, id); const access = this.access(actor, item.leadId, true); if (item.version !== expectedVersion) throw problem(409, 'STALE_APPOINTMENT_VERSION', 'Appointment version is stale');
    const allowed: Record<AppointmentState, AppointmentState[]> = { PROPOSED: ['CONFIRMED', 'RESCHEDULE_REQUESTED', 'CANCELLED'], CONFIRMED: ['RESCHEDULE_REQUESTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'], RESCHEDULE_REQUESTED: ['PROPOSED', 'CONFIRMED', 'CANCELLED'], CANCELLED: [], COMPLETED: [], NO_SHOW: [] };
    if (!allowed[item.state].includes(target)) throw problem(409, 'INVALID_APPOINTMENT_TRANSITION', 'Appointment transition is not allowed');
    if (input?.startAt || input?.endAt || input?.timeZone) { const start = input.startAt ?? item.startAt; const end = input.endAt ?? item.endAt; this.zone(input.timeZone ?? item.timeZone); const times = this.dates(start, end); item.startAt = new Date(times.start).toISOString(); item.endAt = new Date(times.end).toISOString(); item.timeZone = input.timeZone ?? item.timeZone; }
    item.state = target; item.reason = input?.reason; item.version += 1; item.updatedAt = this.store.now(); this.journey(actor, item, `APPOINTMENT_${target}`, input?.reason); this.audit(actor, 'APPOINTMENT_STATE_CHANGED', id); void access; return item;
  }
  journeyFor(actor: Actor, leadId: string) { this.access(actor, leadId); return this.store.journey.filter((event) => event.leadId === leadId); }
}
