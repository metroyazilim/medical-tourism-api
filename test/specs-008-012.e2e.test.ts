import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../src/main';

type Actor = { id: string; type: 'PATIENT' | 'CLINICIAN' | 'SUPER_ADMIN' | 'SYSTEM_WORKER'; organizationId?: string; role?: string };
let app: NestFastifyApplication;
let server: any;
const admin: Actor = { id: 'spec-008-admin', type: 'SUPER_ADMIN' };
const patient: Actor = { id: 'spec-008-patient', type: 'PATIENT' };
const clinician: Actor = { id: 'spec-008-clinician', type: 'CLINICIAN', organizationId: 'spec-008-org', role: 'EDITOR' };

function headers(actor: Actor) { return { 'x-actor-id': actor.id, 'x-actor-type': actor.type, ...(actor.organizationId ? { 'x-organization-id': actor.organizationId } : {}), ...(actor.role ? { 'x-actor-role': actor.role } : {}) }; }
async function call(method: 'GET' | 'POST' | 'PATCH', url: string, actor: Actor, payload?: unknown) { const response = await server.inject({ method, url, headers: headers(actor), payload }); return { response, body: response.body ? JSON.parse(response.body) : undefined }; }

async function createLead() {
  assert.equal((await call('POST', '/api/v1/admin/treatments', admin, { id: 'spec-008-treatment', name: 'Orthopedics', category: 'SURGERY', locales: ['en-US'] })).response.statusCode, 201);
  assert.equal((await call('PATCH', '/api/v1/admin/treatments/spec-008-treatment/publication', admin, { state: 'PUBLISHED' })).response.statusCode, 200);
  assert.equal((await call('POST', '/api/v1/admin/organizations', admin, { id: clinician.organizationId, name: 'Spec Care', country: 'TR' })).response.statusCode, 201);
  for (const state of ['SUBMITTED', 'IN_REVIEW', 'VERIFIED'] as const) assert.equal((await call('PATCH', `/api/v1/admin/organizations/${clinician.organizationId}/publication`, admin, { state })).response.statusCode, 200);
  assert.equal((await call('PATCH', `/api/v1/admin/organizations/${clinician.organizationId}/verification`, admin, { verified: true })).response.statusCode, 200);
  assert.equal((await call('PATCH', `/api/v1/admin/organizations/${clinician.organizationId}/publication`, admin, { state: 'PUBLISHED' })).response.statusCode, 200);
  assert.equal((await call('POST', `/api/v1/organizations/${clinician.organizationId}/treatments/spec-008-treatment`, admin)).response.statusCode, 201);
  const membership = await call('POST', '/api/v1/admin/memberships', admin, { actorId: clinician.id, organizationId: clinician.organizationId, role: 'EDITOR' });
  assert.equal((await call('POST', `/api/v1/memberships/${membership.body.id}/accept`, clinician)).response.statusCode, 201);
  assert.equal((await call('POST', '/api/v1/consent', patient, { version: 'spec-008-consent', locale: 'en-US' })).response.statusCode, 201);
  const draft = await call('POST', '/api/v1/inquiries', patient, { treatmentId: 'spec-008-treatment', country: 'TR', summary: 'Structured treatment request', language: 'en-US' });
  const submitted = await call('POST', `/api/v1/inquiries/${draft.body.id}/submit`, patient, { organizationIds: [clinician.organizationId], consentVersion: 'spec-008-consent', idempotencyKey: 'spec-008-submit' });
  return submitted.body.id as string;
}

before(async () => { app = await createApp(); await app.init(); server = app.getHttpAdapter().getInstance(); await server.ready(); });
after(async () => { await app.close(); });

describe('SPEC-008–012 files, quotes, appointments, notifications and privacy', () => {
  it('quarantines files until scan and rechecks lead grant access', async () => {
    const inquiryId = await createLead();
    const lead = (await call('GET', `/api/v1/inquiries/${inquiryId}`, patient)).body.leads[0];
    const intent = await call('POST', '/api/v1/files/upload-intents', patient, { contextType: 'LEAD', contextId: lead.id, filename: 'scan.pdf', mimeType: 'application/pdf', size: 2048, checksum: 'checksum-008', idempotencyKey: 'file-008' });
    assert.equal(intent.response.statusCode, 201);
    assert.equal((await call('POST', `/api/v1/files/${intent.body.id}/complete`, patient, { checksum: 'checksum-008' })).response.statusCode, 201);
    assert.equal((await call('GET', `/api/v1/files/${intent.body.id}/download`, clinician)).response.statusCode, 409);
    assert.equal((await call('POST', `/api/v1/files/admin/${intent.body.id}/scan-result`, admin, { state: 'AVAILABLE' })).response.statusCode, 201);
    assert.equal((await call('GET', `/api/v1/files/${intent.body.id}/download`, clinician)).response.statusCode, 200);
    assert.equal((await call('POST', `/api/v1/leads/${lead.id}/revoke`, patient, { reason: 'grant revoked' })).response.statusCode, 201);
    assert.equal((await call('GET', `/api/v1/files/${intent.body.id}/download`, clinician)).response.statusCode, 404);
  });

  it('keeps quote and appointment state machines versioned and isolated', async () => {
    const inquiryId = await createLead();
    const lead = (await call('GET', `/api/v1/inquiries/${inquiryId}`, patient)).body.leads[0];
    const quote = await call('POST', `/api/v1/leads/${lead.id}/quotes`, clinician, { currency: 'EUR', items: [{ description: 'Consultation', quantity: 1, amountMinor: 12500, included: true }], validityEnd: new Date(Date.now() + 86400000).toISOString() });
    assert.equal(quote.response.statusCode, 201);
    assert.equal((await call('POST', `/api/v1/quotes/${quote.body.id}/publish`, clinician, { expectedVersion: 1 })).response.statusCode, 201);
    assert.equal((await call('POST', `/api/v1/quotes/${quote.body.id}/accept`, patient, { expectedVersion: 2, idempotencyKey: 'accept-008' })).response.statusCode, 201);
    const start = new Date(Date.now() + 3 * 86400000).toISOString(); const end = new Date(Date.now() + 3 * 86400000 + 3600000).toISOString();
    const appointment = await call('POST', `/api/v1/leads/${lead.id}/appointments`, patient, { startAt: start, endAt: end, timeZone: 'Europe/Istanbul' });
    assert.equal(appointment.response.statusCode, 201);
    assert.equal((await call('POST', `/api/v1/appointments/${appointment.body.id}/confirm`, clinician, { expectedVersion: 1 })).response.statusCode, 201);
    const stale = await call('POST', `/api/v1/appointments/${appointment.body.id}/cancel`, patient, { expectedVersion: 1, reason: 'stale' });
    assert.equal(stale.response.statusCode, 409);
    assert.equal((await call('POST', `/api/v1/appointments/${appointment.body.id}/cancel`, patient, { expectedVersion: 2, reason: 'Patient requested cancellation' })).response.statusCode, 201);
    assert.equal((await call('GET', `/api/v1/leads/${lead.id}/journey`, patient)).body.length >= 3, true);
  });

  it('deduplicates in-app notifications and anonymizes privacy-owned state', async () => {
    const worker: Actor = { id: 'spec-worker', type: 'SYSTEM_WORKER' };
    const notification = await call('POST', '/api/v1/system/notifications', worker, { recipientId: patient.id, category: 'SECURITY', channel: 'IN_APP', template: 'session-revoked', sourceType: 'SESSION', sourceId: 'safe-source', idempotencyKey: 'notification-008' });
    const duplicate = await call('POST', '/api/v1/system/notifications', worker, { recipientId: patient.id, category: 'SECURITY', channel: 'IN_APP', template: 'session-revoked', sourceType: 'SESSION', sourceId: 'safe-source', idempotencyKey: 'notification-008' });
    assert.equal(notification.body.id, duplicate.body.id);
    assert.equal((await call('POST', `/api/v1/notifications/${notification.body.id}/read`, patient)).body.status, 'READ');
    assert.equal((await call('PATCH', '/api/v1/notification-preferences', patient, { security: ['IN_APP'] })).response.statusCode, 200);
    assert.equal((await call('POST', '/api/v1/privacy/request', patient)).body.state, 'REQUESTED');
    const anonymized = await call('POST', `/api/v1/admin/privacy/${patient.id}/anonymize`, admin);
    assert.equal(anonymized.body.state, 'ANONYMIZED');
    assert.equal((await call('GET', '/api/v1/patient/profile', patient)).body.completion, 'EMPTY');
    const gate = await call('POST', '/api/v1/admin/operations/release-gate', admin);
    assert.equal(gate.body.status, 'NOT_READY');
    const retention = await call('GET', '/api/v1/admin/operations/retention-preview', admin);
    assert.equal(retention.body.dryRun, true);
    assert.equal((await call('GET', '/api/v1/admin/platform-audit-events', admin)).body.length > 0, true);
  });
});
