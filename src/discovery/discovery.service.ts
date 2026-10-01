import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';
import { Organization, Doctor, Treatment } from '../platform/platform.types';

@Injectable()
export class DiscoveryService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}

  private patient(actor: Actor) { if (actor.type !== 'PATIENT') throw problem(403, 'FORBIDDEN', 'Authenticated patient access is required'); }
  private target(type: 'organization' | 'doctor' | 'treatment', id: string): Organization | Doctor | Treatment {
    const value = type === 'organization' ? this.store.organizations.get(id) : type === 'doctor' ? this.store.doctors.get(id) : this.store.treatments.get(id);
    if (!value || !value.active || value.publication !== 'PUBLISHED' || ('verified' in value && !value.verified)) throw problem(404, 'PUBLIC_TARGET_NOT_FOUND', 'Public target was not found');
    if (type === 'doctor' && !(value as Doctor).organizationIds.some((organizationId) => {
      const organization = this.store.organizations.get(organizationId);
      return organization?.active && organization.verified && organization.publication === 'PUBLISHED';
    })) throw problem(404, 'PUBLIC_TARGET_NOT_FOUND', 'Public target was not found');
    return value;
  }
  add(actor: Actor, type: 'organization' | 'doctor' | 'treatment', id: string) {
    this.patient(actor); this.target(type, id);
    const key = this.store.key(actor.id, type, id); const existing = this.store.favorites.get(key); if (existing) return existing;
    const item = { patientId: actor.id, entityType: type, entityId: id, createdAt: this.store.now() } as const;
    this.store.favorites.set(key, item); return item;
  }
  remove(actor: Actor, type: 'organization' | 'doctor' | 'treatment', id: string) {
    this.patient(actor); this.store.favorites.delete(this.store.key(actor.id, type, id)); return { removed: true };
  }
  list(actor: Actor, limit = 20) {
    this.patient(actor); if (limit < 1 || limit > 50) throw problem(400, 'INVALID_LIMIT', 'limit must be between 1 and 50');
    return [...this.store.favorites.values()].filter((item) => item.patientId === actor.id).slice(0, limit);
  }
}
