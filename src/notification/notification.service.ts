import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';
import { NotificationChannel, NotificationPreference } from '../platform/platform.types';

@Injectable()
export class NotificationService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}
  private audit(actor: Actor, action: string, id: string) { this.store.platformAudits.push({ id: this.store.id(), actorId: actor.id, actorType: actor.type, action, entityType: 'Notification', entityId: id, requestId: 'notification-request', metadata: {}, createdAt: this.store.now() }); }
  create(actor: Actor, input: { recipientId: string; category: string; channel: NotificationChannel; template: string; sourceType: string; sourceId: string; idempotencyKey: string }) {
    if (actor.type !== 'SYSTEM_WORKER' && actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'System notification access is required');
    if (!input.idempotencyKey || input.template.length > 100 || input.category.length > 80) throw problem(400, 'INVALID_NOTIFICATION', 'Notification metadata is invalid');
    const existing = [...this.store.notifications.values()].find((item) => item.recipientId === input.recipientId && item.idempotencyKey === input.idempotencyKey); if (existing) return existing;
    const now = this.store.now(); const notification = { id: this.store.id(), ...input, status: input.channel === 'IN_APP' ? 'SENT' as const : 'QUEUED' as const, attempts: input.channel === 'IN_APP' ? 1 : 0, createdAt: now, sentAt: input.channel === 'IN_APP' ? now : undefined };
    this.store.notifications.set(notification.id, notification); this.audit(actor, 'NOTIFICATION_CREATED', notification.id); return notification;
  }
  list(actor: Actor) { return [...this.store.notifications.values()].filter((item) => item.recipientId === actor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  read(actor: Actor, id: string) { const item = this.store.notifications.get(id); if (!item || item.recipientId !== actor.id) throw problem(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found'); item.status = 'READ'; item.readAt = this.store.now(); this.audit(actor, 'NOTIFICATION_READ', id); return item; }
  getPreferences(actor: Actor) { return this.store.notificationPreferences.get(actor.id) ?? { actorId: actor.id, channels: {}, updatedAt: this.store.now() }; }
  setPreferences(actor: Actor, channels: Record<string, NotificationChannel[]>) { for (const values of Object.values(channels)) if (values.some((value) => !['IN_APP', 'EMAIL', 'PUSH'].includes(value))) throw problem(422, 'INVALID_NOTIFICATION_CHANNEL', 'Notification channel is invalid'); const current: NotificationPreference = { actorId: actor.id, channels, updatedAt: this.store.now() }; this.store.notificationPreferences.set(actor.id, current); return current; }
  retry(actor: Actor, id: string) { if (actor.type !== 'SUPER_ADMIN' && actor.type !== 'SYSTEM_WORKER') throw problem(403, 'FORBIDDEN', 'Admin or worker access is required'); const item = this.store.notifications.get(id); if (!item) throw problem(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found'); if (item.attempts >= 3) throw problem(409, 'NOTIFICATION_RETRY_EXHAUSTED', 'Notification retry limit reached'); item.attempts += 1; item.status = 'SENT'; item.sentAt = this.store.now(); item.failedAt = undefined; this.audit(actor, 'NOTIFICATION_RETRIED', id); return item; }
  failed(actor: Actor) { if (actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Super admin access is required'); return [...this.store.notifications.values()].filter((item) => item.status === 'FAILED' || item.status === 'QUEUED'); }
}
