import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';
import { Quote, QuoteItem } from '../platform/platform.types';

@Injectable()
export class QuoteService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}

  private access(actor: Actor, leadId: string, mutate = false) {
    const lead = this.store.leads.get(leadId); if (!lead || lead.state === 'REVOKED') throw problem(404, 'LEAD_NOT_FOUND', 'Lead was not found');
    const inquiry = this.store.inquiries.get(lead.inquiryId); if (!inquiry) throw problem(404, 'INQUIRY_NOT_FOUND', 'Inquiry was not found');
    if (actor.type === 'SUPER_ADMIN') return { lead, inquiry };
    if (actor.type === 'PATIENT' && actor.id === inquiry.patientId) return { lead, inquiry };
    const member = [...this.store.memberships.values()].find((item) => item.actorId === actor.id && item.organizationId === lead.organizationId && item.state === 'ACTIVE');
    const grant = [...this.store.grants.values()].some((item) => item.leadId === lead.id && item.active);
    if (actor.type === 'CLINICIAN' && member && grant && (!mutate || member.role !== 'VIEWER')) return { lead, inquiry };
    throw problem(403, 'FORBIDDEN', 'Lead quote access is not available');
  }

  private item(actor: Actor, id: string) { const quote = this.store.quotes.get(id); if (!quote) throw problem(404, 'QUOTE_NOT_FOUND', 'Quote was not found'); this.access(actor, quote.leadId); return quote; }
  private validateItems(items: Array<Omit<QuoteItem, 'id'> & { id?: string }>) { if (!items.length || items.length > 50) throw problem(422, 'INVALID_QUOTE_ITEMS', 'A quote must contain one to fifty items'); if (items.some((item) => item.quantity < 1 || item.amountMinor < 0 || !item.description.trim())) throw problem(422, 'INVALID_QUOTE_ITEMS', 'Quote item values are invalid'); }
  private audit(actor: Actor, action: string, id: string) { this.store.platformAudits.push({ id: this.store.id(), actorId: actor.id, actorType: actor.type, action, entityType: 'Quote', entityId: id, requestId: 'quote-request', metadata: {}, createdAt: this.store.now() }); }

  create(actor: Actor, leadId: string, input: { currency: string; items: Array<Omit<QuoteItem, 'id'> & { id?: string }>; validityEnd: string }) {
    const { lead, inquiry } = this.access(actor, leadId, true); if (actor.type !== 'CLINICIAN' && actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Organization access is required');
    this.validateItems(input.items); if (!/^[A-Z]{3}$/u.test(input.currency)) throw problem(422, 'INVALID_CURRENCY', 'currency must be ISO 4217'); if (Date.parse(input.validityEnd) <= Date.now()) throw problem(422, 'INVALID_QUOTE_EXPIRY', 'validityEnd must be in the future');
    const now = this.store.now(); const item: Quote = { id: this.store.id(), leadId, inquiryId: inquiry.id, organizationId: lead.organizationId, currency: input.currency, items: input.items.map((entry) => ({ ...entry, id: entry.id || this.store.id() })), validityEnd: input.validityEnd, state: 'DRAFT', version: 1, createdAt: now, updatedAt: now };
    this.store.quotes.set(item.id, item); this.audit(actor, 'QUOTE_CREATED', item.id); return item;
  }

  update(actor: Actor, id: string, input: { currency?: string; items?: Array<Omit<QuoteItem, 'id'> & { id?: string }>; validityEnd?: string }, expectedVersion: number) {
    const quote = this.item(actor, id); if (actor.type !== 'CLINICIAN' && actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Organization access is required'); if (quote.state !== 'DRAFT') throw problem(409, 'QUOTE_NOT_DRAFT', 'Only draft quotes can be changed'); if (quote.version !== expectedVersion) throw problem(409, 'STALE_QUOTE_VERSION', 'Quote version is stale');
    if (input.currency && !/^[A-Z]{3}$/u.test(input.currency)) throw problem(422, 'INVALID_CURRENCY', 'currency must be ISO 4217'); if (input.items) this.validateItems(input.items); if (input.validityEnd && Date.parse(input.validityEnd) <= Date.now()) throw problem(422, 'INVALID_QUOTE_EXPIRY', 'validityEnd must be in the future');
    Object.assign(quote, input.items ? { ...input, items: input.items.map((entry) => ({ ...entry, id: entry.id || this.store.id() })) } : input, { version: quote.version + 1, updatedAt: this.store.now() }); this.audit(actor, 'QUOTE_UPDATED', id); return quote;
  }

  publish(actor: Actor, id: string, expectedVersion: number) { const quote = this.item(actor, id); if (actor.type !== 'CLINICIAN' && actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Organization access is required'); if (quote.state !== 'DRAFT') throw problem(409, 'INVALID_QUOTE_TRANSITION', 'Quote is not draft'); if (quote.version !== expectedVersion) throw problem(409, 'STALE_QUOTE_VERSION', 'Quote version is stale'); quote.state = 'PUBLISHED'; quote.version += 1; quote.publishedAt = this.store.now(); quote.updatedAt = quote.publishedAt; this.audit(actor, 'QUOTE_PUBLISHED', id); return quote; }
  withdraw(actor: Actor, id: string, reason?: string) { const quote = this.item(actor, id); if (actor.type !== 'CLINICIAN' && actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Organization access is required'); if (!['DRAFT', 'PUBLISHED'].includes(quote.state)) throw problem(409, 'INVALID_QUOTE_TRANSITION', 'Quote cannot be withdrawn'); quote.state = 'WITHDRAWN'; quote.version += 1; quote.updatedAt = this.store.now(); quote.decisionReason = reason; this.audit(actor, 'QUOTE_WITHDRAWN', id); return quote; }
  list(actor: Actor, leadId: string) { this.access(actor, leadId); return [...this.store.quotes.values()].filter((quote) => quote.leadId === leadId && (actor.type === 'PATIENT' ? ['PUBLISHED', 'ACCEPTED', 'REJECTED', 'EXPIRED'].includes(quote.state) : true)); }
  get(actor: Actor, id: string) { const quote = this.item(actor, id); if (actor.type === 'PATIENT' && !['PUBLISHED', 'ACCEPTED', 'REJECTED', 'EXPIRED'].includes(quote.state)) throw problem(404, 'QUOTE_NOT_FOUND', 'Quote was not found'); return quote; }
  accept(actor: Actor, id: string, expectedVersion: number, idempotencyKey?: string) { const quote = this.get(actor, id); if (actor.type !== 'PATIENT') throw problem(403, 'FORBIDDEN', 'Patient access is required'); if (idempotencyKey) { const old = this.store.idempotency.get(this.store.key(actor.id, 'quote-accept', idempotencyKey)); if (old) return this.store.quotes.get(old); } if (quote.state !== 'PUBLISHED' || Date.parse(quote.validityEnd) <= Date.now()) throw problem(409, 'QUOTE_NOT_ACTIVE', 'Quote is not active'); if (quote.version !== expectedVersion) throw problem(409, 'STALE_QUOTE_VERSION', 'Quote version is stale'); if ([...this.store.quotes.values()].some((other) => other.leadId === quote.leadId && other.state === 'ACCEPTED')) throw problem(409, 'QUOTE_ALREADY_ACCEPTED', 'A quote is already accepted'); quote.state = 'ACCEPTED'; quote.version += 1; quote.decidedAt = this.store.now(); quote.updatedAt = quote.decidedAt; if (idempotencyKey) this.store.idempotency.set(this.store.key(actor.id, 'quote-accept', idempotencyKey), quote.id); this.audit(actor, 'QUOTE_ACCEPTED', id); return quote; }
  reject(actor: Actor, id: string, expectedVersion: number, reason?: string) { const quote = this.get(actor, id); if (actor.type !== 'PATIENT') throw problem(403, 'FORBIDDEN', 'Patient access is required'); if (quote.state !== 'PUBLISHED' || quote.version !== expectedVersion) throw problem(409, 'STALE_OR_INACTIVE_QUOTE', 'Quote is stale or inactive'); quote.state = 'REJECTED'; quote.version += 1; quote.decidedAt = this.store.now(); quote.updatedAt = quote.decidedAt; quote.decisionReason = reason; this.audit(actor, 'QUOTE_REJECTED', id); return quote; }
  expire(actor: Actor, id: string) { if (actor.type !== 'SUPER_ADMIN' && actor.type !== 'SYSTEM_WORKER') throw problem(403, 'FORBIDDEN', 'Admin or worker access is required'); const quote = this.store.quotes.get(id); if (!quote) throw problem(404, 'QUOTE_NOT_FOUND', 'Quote was not found'); if (quote.state === 'PUBLISHED' && Date.parse(quote.validityEnd) <= Date.now()) { quote.state = 'EXPIRED'; quote.version += 1; quote.updatedAt = this.store.now(); this.audit(actor, 'QUOTE_EXPIRED', id); } return quote; }
}
