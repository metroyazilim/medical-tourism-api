import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';
import { AppConfigService } from '../platform/config';

@Injectable()
export class PrivacyService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore, @Inject(AppConfigService) private readonly config: AppConfigService) {}
  private admin(actor: Actor) { if (actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Super admin access is required'); }
  private audit(actor: Actor, action: string, entityType: string, entityId: string, metadata: Record<string, string | number | boolean | undefined> = {}) { this.store.platformAudits.push({ id: this.store.id(), actorId: actor.id, actorType: actor.type, action, entityType, entityId, requestId: 'privacy-request', metadata, createdAt: this.store.now() }); }
  status(actor: Actor) { return [...this.store.privacyRequests.values()].find((item) => item.actorId === actor.id && item.state !== 'CANCELLED') ?? null; }
  request(actor: Actor) { const existing = [...this.store.privacyRequests.values()].find((item) => item.actorId === actor.id && item.state === 'REQUESTED'); if (existing) return existing; const now = this.store.now(); const item = { id: this.store.id(), actorId: actor.id, state: 'REQUESTED' as const, policyVersion: 'privacy-v1', requestedAt: now, updatedAt: now }; this.store.privacyRequests.set(item.id, item); this.audit(actor, 'PRIVACY_REQUESTED', 'PrivacyRequest', item.id); return item; }
  cancel(actor: Actor) { const item = [...this.store.privacyRequests.values()].find((candidate) => candidate.actorId === actor.id && candidate.state === 'REQUESTED'); if (!item) throw problem(404, 'PRIVACY_REQUEST_NOT_FOUND', 'Privacy request was not found'); item.state = 'CANCELLED'; item.updatedAt = this.store.now(); this.audit(actor, 'PRIVACY_REQUEST_CANCELLED', 'PrivacyRequest', item.id); return item; }
  anonymize(actor: Actor, targetActorId: string) {
    this.admin(actor); const request = [...this.store.privacyRequests.values()].find((item) => item.actorId === targetActorId && item.state === 'REQUESTED'); if (!request) throw problem(404, 'PRIVACY_REQUEST_NOT_FOUND', 'Active privacy request was not found');
    this.store.profiles.delete(targetActorId); this.store.preferences.delete(targetActorId); this.store.consents.delete(targetActorId); for (const key of [...this.store.favorites.keys()]) if (key.startsWith(`${targetActorId}:`)) this.store.favorites.delete(key); for (const session of this.store.sessions.values()) if (session.actorId === targetActorId) session.revokedAt = this.store.now(); for (const grant of this.store.grants.values()) if (grant.patientId === targetActorId) { grant.active = false; grant.revokedAt = this.store.now(); }
    request.state = 'ANONYMIZED'; request.updatedAt = this.store.now(); this.audit(actor, 'PRIVACY_ANONYMIZED', 'PrivacyRequest', request.id, { policyVersion: request.policyVersion }); return { id: request.id, state: request.state, policyVersion: request.policyVersion };
  }
  audits(actor: Actor) { this.admin(actor); return this.store.platformAudits.map((event) => ({ ...event, metadata: { ...event.metadata } })); }
  checks(actor: Actor) {
    this.admin(actor); const checks = [
      { name: 'database', status: this.config.value.DATABASE_URL ? 'READY' as const : 'NOT_CONFIGURED' as const, detailCode: this.config.value.DATABASE_URL ? 'DATABASE_CONFIGURED' : 'DATABASE_ADAPTER_NOT_CONFIGURED' },
      { name: 'backup', status: 'NOT_CONFIGURED' as const, detailCode: 'BACKUP_PROVIDER_NOT_CONFIGURED' },
      { name: 'migration', status: 'NOT_CONFIGURED' as const, detailCode: 'MIGRATION_RELEASE_NOT_CONFIGURED' },
      { name: 'notification-provider', status: 'NOT_CONFIGURED' as const, detailCode: 'DELIVERY_PROVIDER_NOT_CONFIGURED' },
    ];
    for (const check of checks) this.store.operationsChecks.set(check.name, { ...check, observedAt: this.store.now() }); return [...this.store.operationsChecks.values()];
  }
  retentionPreview(actor: Actor) {
    this.admin(actor);
    return {
      policyVersion: 'privacy-v1',
      dryRun: true,
      candidates: {
        revokedSessions: [...this.store.sessions.values()].filter((item) => Boolean(item.revokedAt)).length,
        deletedAttachments: [...this.store.attachments.values()].filter((item) => item.state === 'DELETED').length,
        expiredQuotes: [...this.store.quotes.values()].filter((item) => item.state === 'EXPIRED').length,
        anonymizedRequests: [...this.store.privacyRequests.values()].filter((item) => item.state === 'ANONYMIZED').length,
      },
    };
  }
  releaseGate(actor: Actor) { const checks = this.checks(actor); const ready = checks.every((check) => check.status === 'READY'); this.audit(actor, 'RELEASE_GATE_CHECKED', 'OperationsCheck', 'release-gate', { ready }); return { status: ready ? 'PASS' : 'NOT_READY', checks: checks.map((check) => ({ name: check.name, status: check.status, detailCode: check.detailCode })) }; }
}
