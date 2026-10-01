import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';
import { Doctor, Organization, PublicationState, Treatment } from '../platform/platform.types';

function normalized(value: string): string { return value.normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').toLocaleLowerCase('tr-TR'); }

type PageQuery = { limit?: number; cursor?: string };

@Injectable()
export class DirectoryService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}

  private page<T extends { id: string }>(items: T[], query: PageQuery, type: string, filters: Record<string, unknown>) {
    const limit = query.limit ?? 20;
    if (limit < 1 || limit > 50) throw problem(400, 'INVALID_LIMIT', 'limit must be between 1 and 50');
    const context = JSON.stringify({ type, ...filters });
    let start = 0;
    if (query.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')) as { context?: string; lastId?: string };
        if (decoded.context !== context || !decoded.lastId) throw new Error('invalid cursor');
        const index = items.findIndex((item) => item.id === decoded.lastId);
        if (index < 0) throw new Error('invalid cursor');
        start = index + 1;
      } catch {
        throw problem(400, 'INVALID_CURSOR', 'Cursor is invalid or incompatible with this query');
      }
    }
    const page = items.slice(start, start + limit);
    const next = start + limit < items.length && page.length ? page[page.length - 1].id : null;
    return { items: page, nextCursor: next ? Buffer.from(JSON.stringify({ context, lastId: next }), 'utf8').toString('base64url') : null, limit };
  }

  private admin(actor: Actor) { if (actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Super admin access is required'); }

  createOrganization(actor: Actor, input: { id?: string; name: string; country: string; city?: string; languages?: string[]; treatmentIds?: string[] }): Organization {
    this.admin(actor);
    const item: Organization = { id: input.id ?? this.store.id(), name: input.name, country: input.country, city: input.city, languages: input.languages ?? [], treatmentIds: input.treatmentIds ?? [], publication: 'DRAFT', verified: false, active: true, updatedAt: this.store.now() };
    this.store.organizations.set(item.id, item);
    return item;
  }

  createDoctor(actor: Actor, input: { id?: string; name: string; specialties?: string[]; organizationIds?: string[] }): Doctor {
    this.admin(actor);
    const item: Doctor = { id: input.id ?? this.store.id(), name: input.name, specialties: input.specialties ?? [], organizationIds: input.organizationIds ?? [], publication: 'DRAFT', verified: false, active: true, updatedAt: this.store.now() };
    this.store.doctors.set(item.id, item);
    return item;
  }

  createTreatment(actor: Actor, input: { id?: string; name: string; category: string; locales?: string[] }): Treatment {
    this.admin(actor);
    const item: Treatment = { id: input.id ?? this.store.id(), name: input.name, category: input.category, locales: input.locales ?? [], publication: 'DRAFT', active: true, updatedAt: this.store.now() };
    this.store.treatments.set(item.id, item);
    return item;
  }

  setTreatmentPublication(actor: Actor, id: string, state: PublicationState): Treatment {
    this.admin(actor); const item = this.store.treatments.get(id); if (!item) throw problem(404, 'TREATMENT_NOT_FOUND', 'Treatment was not found');
    if (state !== 'PUBLISHED' && state !== 'DRAFT' && state !== 'SUSPENDED' && state !== 'EXPIRED') throw problem(422, 'INVALID_TREATMENT_STATE', 'Treatment publication state is not supported');
    item.publication = state; return item;
  }

  setDoctorPublication(actor: Actor, id: string, state: PublicationState): Doctor {
    this.admin(actor); const item = this.store.doctors.get(id); if (!item) throw problem(404, 'DOCTOR_NOT_FOUND', 'Doctor was not found');
    if (state !== 'PUBLISHED' && state !== 'DRAFT' && state !== 'SUSPENDED' && state !== 'EXPIRED') throw problem(422, 'INVALID_DOCTOR_STATE', 'Doctor publication state is not supported');
    item.publication = state; item.updatedAt = this.store.now(); return item;
  }

  setOrganizationPublication(actor: Actor, id: string, state: PublicationState): Organization {
    this.admin(actor); const item = this.store.organizations.get(id); if (!item) throw problem(404, 'ORGANIZATION_NOT_FOUND', 'Organization was not found');
    const allowed: Record<PublicationState, PublicationState[]> = { DRAFT: ['SUBMITTED'], SUBMITTED: ['IN_REVIEW'], IN_REVIEW: ['VERIFIED', 'SUSPENDED', 'EXPIRED'], VERIFIED: ['PUBLISHED', 'SUSPENDED', 'EXPIRED'], PUBLISHED: ['DRAFT', 'SUSPENDED', 'EXPIRED'], SUSPENDED: ['IN_REVIEW', 'VERIFIED', 'EXPIRED'], EXPIRED: ['IN_REVIEW'], REJECTED: [] } as Record<PublicationState, PublicationState[]>;
    if (item.publication !== state && !allowed[item.publication].includes(state)) throw problem(409, 'INVALID_PUBLICATION_TRANSITION', 'Organization publication transition is not allowed');
    item.publication = state; item.updatedAt = this.store.now(); return item;
  }

  setOrganizationVerification(actor: Actor, id: string, verified: boolean, expiresAt?: string): Organization {
    this.admin(actor); const item = this.store.organizations.get(id); if (!item) throw problem(404, 'ORGANIZATION_NOT_FOUND', 'Organization was not found');
    item.verified = verified; item.verificationExpiresAt = expiresAt; item.updatedAt = this.store.now(); return item;
  }

  setDoctorVerification(actor: Actor, id: string, verified: boolean): Doctor {
    this.admin(actor); const item = this.store.doctors.get(id); if (!item) throw problem(404, 'DOCTOR_NOT_FOUND', 'Doctor was not found');
    item.verified = verified; item.updatedAt = this.store.now(); return item;
  }

  linkTreatment(actor: Actor, organizationId: string, treatmentId: string): Organization {
    if (actor.type !== 'SUPER_ADMIN' && (!actor.organizationId || actor.organizationId !== organizationId)) throw problem(403, 'FORBIDDEN', 'Organization scope is required');
    const organization = this.store.organizations.get(organizationId); const treatment = this.store.treatments.get(treatmentId);
    if (!organization || !treatment) throw problem(404, 'DIRECTORY_ENTITY_NOT_FOUND', 'Organization or treatment was not found');
    if (!organization.treatmentIds.includes(treatmentId)) organization.treatmentIds.push(treatmentId);
    return organization;
  }

  publicOrganizations(query: { query?: string; country?: string; city?: string; language?: string; treatmentId?: string; limit?: number; cursor?: string }) {
    const text = query.query ? normalized(query.query) : undefined;
    const now = Date.now();
    const items = [...this.store.organizations.values()].filter((item) => item.active && item.verified && item.publication === 'PUBLISHED' && (!item.verificationExpiresAt || Date.parse(item.verificationExpiresAt) > now))
      .filter((item) => !text || normalized(`${item.name} ${item.city ?? ''} ${item.country}`).includes(text))
      .filter((item) => !query.country || normalized(item.country) === normalized(query.country))
      .filter((item) => !query.city || normalized(item.city ?? '') === normalized(query.city))
      .filter((item) => !query.language || item.languages.includes(query.language))
      .filter((item) => !query.treatmentId || item.treatmentIds.includes(query.treatmentId))
      .sort((a, b) => a.id.localeCompare(b.id));
    return this.page(items, query, 'organizations', { query: query.query, country: query.country, city: query.city, language: query.language, treatmentId: query.treatmentId });
  }

  publicDoctors(query: { query?: string; specialty?: string; organizationId?: string; limit?: number; cursor?: string }) {
    const text = query.query ? normalized(query.query) : undefined;
    const publicOrganizations = new Set(this.publicOrganizations({ limit: 50 }).items.map((org) => org.id));
    const items = [...this.store.doctors.values()].filter((doctor) => doctor.active && doctor.verified && doctor.publication === 'PUBLISHED' && doctor.organizationIds.some((id) => publicOrganizations.has(id)))
      .filter((doctor) => !text || normalized(doctor.name).includes(text))
      .filter((doctor) => !query.specialty || doctor.specialties.includes(query.specialty))
      .filter((doctor) => !query.organizationId || doctor.organizationIds.includes(query.organizationId))
      .sort((a, b) => a.id.localeCompare(b.id));
    return this.page(items, query, 'doctors', { query: query.query, specialty: query.specialty, organizationId: query.organizationId });
  }

  publicTreatments(query: { query?: string; category?: string; locale?: string; limit?: number; cursor?: string }) {
    const text = query.query ? normalized(query.query) : undefined;
    const items = [...this.store.treatments.values()].filter((item) => item.active && item.publication === 'PUBLISHED')
      .filter((item) => !text || normalized(`${item.name} ${item.category}`).includes(text))
      .filter((item) => !query.category || item.category === query.category)
      .filter((item) => !query.locale || item.locales.includes(query.locale))
      .sort((a, b) => a.id.localeCompare(b.id));
    return this.page(items, query, 'treatments', { query: query.query, category: query.category, locale: query.locale });
  }

  publicOrganization(id: string) {
    const result = this.publicOrganizations({ limit: 50 }).items.find((item) => item.id === id);
    if (!result) throw problem(404, 'PUBLIC_TARGET_NOT_FOUND', 'Public organization was not found');
    return result;
  }

  publicDoctor(id: string) {
    const result = this.publicDoctors({ limit: 50 }).items.find((item) => item.id === id);
    if (!result) throw problem(404, 'PUBLIC_TARGET_NOT_FOUND', 'Public doctor was not found');
    return result;
  }

  publicTreatment(id: string) {
    const result = this.publicTreatments({ limit: 50 }).items.find((item) => item.id === id);
    if (!result) throw problem(404, 'PUBLIC_TARGET_NOT_FOUND', 'Public treatment was not found');
    return result;
  }
}
