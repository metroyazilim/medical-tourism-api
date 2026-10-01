import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';

@Injectable()
export class IdentityService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}

  me(actor: Actor) {
    return { actor, consent: this.store.consents.get(actor.id) ?? null, memberships: [...this.store.memberships.values()].filter((item) => item.actorId === actor.id) };
  }

  createSession(actor: Actor, provider: string) {
    const session = { id: this.store.id(), actorId: actor.id, provider, createdAt: this.store.now() };
    this.store.sessions.set(session.id, session);
    return session;
  }

  listSessions(actor: Actor) {
    return [...this.store.sessions.values()].filter((session) => session.actorId === actor.id && !session.revokedAt);
  }

  revokeSession(actor: Actor, id: string) {
    const session = this.store.sessions.get(id);
    if (!session) throw problem(404, 'SESSION_NOT_FOUND', 'Session was not found');
    if (session.actorId !== actor.id && actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Session does not belong to actor');
    session.revokedAt = this.store.now();
    return session;
  }

  setConsent(actor: Actor, version: string, locale?: string) {
    if (actor.type !== 'PATIENT') throw problem(403, 'FORBIDDEN', 'Only patients can manage general consent');
    const record = { actorId: actor.id, version, accepted: true, locale, updatedAt: this.store.now() };
    this.store.consents.set(actor.id, record);
    return record;
  }

  withdrawConsent(actor: Actor) {
    const record = this.store.consents.get(actor.id);
    if (!record) throw problem(404, 'CONSENT_NOT_FOUND', 'Consent was not found');
    record.accepted = false;
    record.updatedAt = this.store.now();
    return record;
  }

  createMembership(actor: Actor, actorId: string, organizationId: string, role: string) {
    if (actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Super admin access is required');
    const membership = { id: this.store.id(), actorId, organizationId, role, state: 'PENDING' as const, createdAt: this.store.now() };
    this.store.memberships.set(membership.id, membership);
    return membership;
  }

  acceptMembership(actor: Actor, id: string) {
    const membership = this.store.memberships.get(id);
    if (!membership) throw problem(404, 'MEMBERSHIP_NOT_FOUND', 'Membership was not found');
    if (membership.actorId !== actor.id) throw problem(403, 'FORBIDDEN', 'Membership does not belong to actor');
    membership.state = 'ACTIVE';
    return membership;
  }

  revokeMembership(actor: Actor, id: string) {
    if (actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Super admin access is required');
    const membership = this.store.memberships.get(id);
    if (!membership) throw problem(404, 'MEMBERSHIP_NOT_FOUND', 'Membership was not found');
    membership.state = 'REVOKED';
    return membership;
  }

  requestDeletion(actor: Actor) {
    const existing = [...this.store.deletionRequests.values()].find((item) => item.actorId === actor.id && item.state === 'REQUESTED');
    if (existing) return existing;
    const now = this.store.now(); const item = { id: this.store.id(), actorId: actor.id, state: 'REQUESTED' as const, requestedAt: now, updatedAt: now };
    this.store.deletionRequests.set(item.id, item); return item;
  }

  cancelDeletion(actor: Actor) {
    const item = [...this.store.deletionRequests.values()].find((candidate) => candidate.actorId === actor.id && candidate.state === 'REQUESTED');
    if (!item) throw problem(404, 'DELETION_REQUEST_NOT_FOUND', 'Deletion request was not found');
    item.state = 'CANCELLED'; item.updatedAt = this.store.now(); return item;
  }
}
