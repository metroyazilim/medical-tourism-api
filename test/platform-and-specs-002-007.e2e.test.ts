import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../src/main';

type Actor = { id: string; type: 'PATIENT' | 'CLINICIAN' | 'SUPER_ADMIN'; organizationId?: string; role?: string };

let app: NestFastifyApplication;
let server: any;

function headers(actor?: Actor): Record<string, string> {
  return actor ? {
    'x-actor-id': actor.id,
    'x-actor-type': actor.type,
    ...(actor.organizationId ? { 'x-organization-id': actor.organizationId } : {}),
    ...(actor.role ? { 'x-actor-role': actor.role } : {}),
  } : {};
}

async function call(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, actor?: Actor, payload?: unknown) {
  const response = await server.inject({ method, url, headers: headers(actor), payload });
  return { response, body: response.body ? JSON.parse(response.body) : undefined };
}

async function publishOrganization(admin: Actor, id: string) {
  for (const state of ['SUBMITTED', 'IN_REVIEW', 'VERIFIED'] as const) {
    const result = await call('PATCH', `/api/v1/admin/organizations/${id}/publication`, admin, { state });
    assert.equal(result.response.statusCode, 200);
  }
  const verified = await call('PATCH', `/api/v1/admin/organizations/${id}/verification`, admin, { verified: true });
  assert.equal(verified.response.statusCode, 200);
  const published = await call('PATCH', `/api/v1/admin/organizations/${id}/publication`, admin, { state: 'PUBLISHED' });
  assert.equal(published.response.statusCode, 200);
}

before(async () => {
  app = await createApp();
  await app.init();
  server = app.getHttpAdapter().getInstance();
  await server.ready();
});

after(async () => {
  await app.close();
});

describe('SPEC-002–007 platform and domain slices', () => {
  it('exposes safe foundation health, identity, consent, session and private profile boundaries', async () => {
    const live = await call('GET', '/health/live');
    const ready = await call('GET', '/health/ready');
    assert.equal(live.response.statusCode, 200);
    assert.equal(ready.response.statusCode, 200);
    assert.equal(ready.body.data.database, 'in-memory-adapter');

    const patient: Actor = { id: 'spec-patient-foundation', type: 'PATIENT' };
    const session = await call('POST', '/api/v1/auth/sessions', patient, { provider: 'firebase-email-password' });
    assert.equal(session.response.statusCode, 201);
    const sessions = await call('GET', '/api/v1/auth/sessions', patient);
    assert.equal(sessions.body.length, 1);
    const consent = await call('POST', '/api/v1/consent', patient, { version: 'general-v1', locale: 'tr-TR' });
    assert.equal(consent.response.statusCode, 201);
    const profile = await call('PATCH', '/api/v1/patient/profile', patient, { country: 'TR', locale: 'tr-TR' });
    assert.equal(profile.body.completion, 'READY');
    const preferences = await call('PATCH', '/api/v1/patient/preferences', patient, { currency: 'TRY', contact: { inquiry: 'IN_APP' } });
    assert.equal(preferences.body.currency, 'TRY');
    const invalidProfile = await call('PATCH', '/api/v1/patient/profile', patient, { country: 'Turkey' });
    assert.equal(invalidProfile.response.statusCode, 422);
    const deletion = await call('POST', '/api/v1/account/deletion', patient);
    assert.equal(deletion.body.state, 'REQUESTED');
    const cancelled = await call('POST', '/api/v1/account/deletion/cancel', patient);
    assert.equal(cancelled.body.state, 'CANCELLED');
  });

  it('keeps discovery public-safe, filtered and private favorites idempotent', async () => {
    const admin: Actor = { id: 'spec-admin-directory', type: 'SUPER_ADMIN' };
    const patient: Actor = { id: 'spec-patient-discovery', type: 'PATIENT' };
    const treatment = await call('POST', '/api/v1/admin/treatments', admin, { id: 'treatment-001', name: 'Dental Implant', category: 'DENTISTRY', locales: ['en-US', 'tr-TR'] });
    assert.equal(treatment.response.statusCode, 201);
    const treatmentPublished = await call('PATCH', '/api/v1/admin/treatments/treatment-001/publication', admin, { state: 'PUBLISHED' });
    assert.equal(treatmentPublished.response.statusCode, 200);
    const organization = await call('POST', '/api/v1/admin/organizations', admin, { id: 'org-001', name: 'Istanbul Care', country: 'TR', city: 'Istanbul', languages: ['tr-TR', 'en-US'] });
    assert.equal(organization.response.statusCode, 201);
    await publishOrganization(admin, 'org-001');
    const link = await call('POST', '/api/v1/organizations/org-001/treatments/treatment-001', admin);
    assert.equal(link.response.statusCode, 201);
    const doctor = await call('POST', '/api/v1/admin/doctors', admin, { id: 'doctor-001', name: 'Dr. Ada', specialties: ['DENTISTRY'], organizationIds: ['org-001'] });
    assert.equal(doctor.response.statusCode, 201);
    assert.equal((await call('PATCH', '/api/v1/admin/doctors/doctor-001/verification', admin, { verified: true })).response.statusCode, 200);
    assert.equal((await call('PATCH', '/api/v1/admin/doctors/doctor-001/publication', admin, { state: 'PUBLISHED' })).response.statusCode, 200);

    const organizations = await call('GET', '/api/v1/discovery/organizations?country=TR&language=tr-TR', undefined);
    assert.deepEqual(organizations.body.items.map((item: { id: string }) => item.id), ['org-001']);
    const doctorDetail = await call('GET', '/api/v1/discovery/doctors/doctor-001');
    assert.equal(doctorDetail.body.id, 'doctor-001');
    const treatmentDetail = await call('GET', '/api/v1/discovery/treatments/treatment-001');
    assert.equal(treatmentDetail.body.id, 'treatment-001');
    const favorite = await call('POST', '/api/v1/favorites', patient, { entityType: 'organization', entityId: 'org-001' });
    const favoriteAgain = await call('POST', '/api/v1/favorites', patient, { entityType: 'organization', entityId: 'org-001' });
    assert.equal(favorite.body.createdAt, favoriteAgain.body.createdAt);
    assert.equal((await call('GET', '/api/v1/favorites', patient)).body.length, 1);
    assert.equal((await call('GET', '/api/v1/favorites', { id: 'other-patient', type: 'PATIENT' })).body.length, 0);
    assert.equal((await call('GET', '/api/v1/discovery/organizations/org-hidden')).response.statusCode, 404);
  });

  it('routes one inquiry to at most three isolated leads with consent, grants, versions and history', async () => {
    const admin: Actor = { id: 'spec-admin-inquiry', type: 'SUPER_ADMIN' };
    const patient: Actor = { id: 'spec-patient-inquiry', type: 'PATIENT' };
    const clinician: Actor = { id: 'spec-clinician-inquiry', type: 'CLINICIAN', organizationId: 'org-inquiry', role: 'EDITOR' };
    const treatment = await call('POST', '/api/v1/admin/treatments', admin, { id: 'treatment-inquiry', name: 'Hair Transplant', category: 'AESTHETICS', locales: ['en-US'] });
    assert.equal(treatment.response.statusCode, 201);
    assert.equal((await call('PATCH', '/api/v1/admin/treatments/treatment-inquiry/publication', admin, { state: 'PUBLISHED' })).response.statusCode, 200);
    for (const id of ['org-inquiry', 'org-inquiry-2', 'org-inquiry-3', 'org-inquiry-4']) {
      assert.equal((await call('POST', '/api/v1/admin/organizations', admin, { id, name: id, country: 'TR' })).response.statusCode, 201);
      await publishOrganization(admin, id);
      assert.equal((await call('POST', `/api/v1/organizations/${id}/treatments/treatment-inquiry`, admin)).response.statusCode, 201);
    }
    const membership = await call('POST', '/api/v1/admin/memberships', admin, { actorId: clinician.id, organizationId: clinician.organizationId, role: 'EDITOR' });
    assert.equal(membership.response.statusCode, 201);
    assert.equal((await call('POST', `/api/v1/memberships/${membership.body.id}/accept`, clinician)).response.statusCode, 201);
    assert.equal((await call('POST', '/api/v1/consent', patient, { version: 'general-v2', locale: 'en-US' })).response.statusCode, 201);
    const draft = await call('POST', '/api/v1/inquiries', patient, { treatmentId: 'treatment-inquiry', country: 'TR', summary: 'Need a bounded consultation', language: 'en-US' });
    assert.equal(draft.response.statusCode, 201);
    const tooMany = await call('POST', `/api/v1/inquiries/${draft.body.id}/submit`, patient, { organizationIds: ['org-inquiry', 'org-inquiry-2', 'org-inquiry-3', 'org-inquiry-4'], consentVersion: 'general-v2' });
    assert.equal(tooMany.response.statusCode, 400);
    const submitted = await call('POST', `/api/v1/inquiries/${draft.body.id}/submit`, patient, { organizationIds: ['org-inquiry', 'org-inquiry-2'], consentVersion: 'general-v2', idempotencyKey: 'submit-1' });
    assert.equal(submitted.response.statusCode, 201);
    const duplicate = await call('POST', `/api/v1/inquiries/${draft.body.id}/submit`, patient, { organizationIds: ['org-inquiry', 'org-inquiry-2'], consentVersion: 'general-v2', idempotencyKey: 'submit-1' });
    assert.equal(duplicate.body.id, submitted.body.id);
    assert.equal(submitted.body.selectedOrganizationIds.length, 2);
    const clinicianView = await call('GET', '/api/v1/inquiries', clinician);
    assert.equal(clinicianView.body.length, 1);
    assert.equal(clinicianView.body[0].leads.length, 1);
    const lead = clinicianView.body[0].leads[0];
    const accepted = await call('POST', `/api/v1/leads/${lead.id}/assignment/accept`, clinician, { expectedVersion: 1, reason: 'Capacity confirmed' });
    assert.equal(accepted.response.statusCode, 201);
    const stale = await call('POST', `/api/v1/leads/${lead.id}/transition`, clinician, { target: 'IN_DISCUSSION', expectedVersion: 1 });
    assert.equal(stale.response.statusCode, 409);
    const transitioned = await call('POST', `/api/v1/leads/${lead.id}/transition`, clinician, { target: 'IN_DISCUSSION', expectedVersion: 2, idempotencyKey: 'transition-1' });
    assert.equal(transitioned.response.statusCode, 201);
    const revoked = await call('POST', `/api/v1/leads/${lead.id}/revoke`, patient, { reason: 'Patient withdrew access' });
    assert.equal(revoked.body.state, 'REVOKED');
    const hidden = await call('GET', '/api/v1/inquiries', clinician);
    assert.equal(hidden.body.length, 0);
  });
});
