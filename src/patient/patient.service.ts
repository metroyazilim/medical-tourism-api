import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';

@Injectable()
export class PatientService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}

  profile(actor: Actor) {
    if (actor.type !== 'PATIENT') throw problem(403, 'FORBIDDEN', 'Patient profile access is required');
    return this.store.profiles.get(actor.id) ?? { patientId: actor.id, completion: 'EMPTY', fields: {}, updatedAt: this.store.now() };
  }

  updateProfile(actor: Actor, fields: Record<string, string>) {
    if (actor.type !== 'PATIENT') throw problem(403, 'FORBIDDEN', 'Only patients can update their profile');
    const allowed = ['displayName', 'country', 'locale', 'currency'];
    const unknown = Object.keys(fields).filter((key) => !allowed.includes(key));
    if (unknown.length) throw problem(400, 'UNKNOWN_PROFILE_FIELD', 'Unknown profile fields are not accepted', { fields: unknown });
    if (fields.country && !/^[A-Z]{2}$/u.test(fields.country)) throw problem(422, 'INVALID_COUNTRY', 'country must be ISO 3166-1 alpha-2');
    if (fields.locale && !/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})*$/u.test(fields.locale)) throw problem(422, 'INVALID_LOCALE', 'locale must be a BCP 47-like tag');
    if (fields.currency && !/^[A-Z]{3}$/u.test(fields.currency)) throw problem(422, 'INVALID_CURRENCY', 'currency must be ISO 4217');
    const current = this.store.profiles.get(actor.id) ?? { patientId: actor.id, completion: 'EMPTY' as const, fields: {}, updatedAt: this.store.now() };
    Object.assign(current.fields, fields);
    current.completion = Object.keys(current.fields).length >= 2 ? 'READY' : 'PARTIAL';
    current.updatedAt = this.store.now();
    this.store.profiles.set(actor.id, current);
    return current;
  }

  preferences(actor: Actor) {
    if (actor.type !== 'PATIENT') throw problem(403, 'FORBIDDEN', 'Patient preferences access is required');
    return this.store.preferences.get(actor.id) ?? { patientId: actor.id, contact: {}, updatedAt: this.store.now() };
  }

  updatePreferences(actor: Actor, input: { locale?: string; currency?: string; contact?: Record<string, 'IN_APP' | 'EMAIL' | 'PUSH'> }) {
    if (actor.type !== 'PATIENT') throw problem(403, 'FORBIDDEN', 'Only patients can update preferences');
    const current = this.store.preferences.get(actor.id) ?? { patientId: actor.id, contact: {}, updatedAt: this.store.now() };
    Object.assign(current, input, { contact: { ...current.contact, ...(input.contact ?? {}) }, updatedAt: this.store.now() });
    this.store.preferences.set(actor.id, current);
    return current;
  }
}
