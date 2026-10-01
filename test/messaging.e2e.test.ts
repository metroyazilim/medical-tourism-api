import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../src/main';

type Actor = { id: string; type: 'PATIENT' | 'CLINICIAN' | 'SUPER_ADMIN'; organizationId?: string };

let app: NestFastifyApplication;
let server: any;

function headers(actor: Actor): Record<string, string> {
  return {
    'x-actor-id': actor.id,
    'x-actor-type': actor.type,
    ...(actor.organizationId ? { 'x-organization-id': actor.organizationId } : {}),
  };
}

async function call(method: 'GET' | 'POST' | 'PATCH', url: string, actor: Actor, payload?: unknown) {
  const response = await server.inject({ method, url, headers: headers(actor), payload });
  return { response, body: response.body ? JSON.parse(response.body) : undefined };
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

describe('SPEC-001 message governance', () => {
  it('keeps participant views current-only and admin views revision history', async () => {
    const patient: Actor = { id: 'patient-1', type: 'PATIENT' };
    const admin: Actor = { id: 'admin-1', type: 'SUPER_ADMIN' };
    const conversation = await call('POST', '/api/v1/conversations', patient, {
      patientId: patient.id,
      clinicianId: 'clinician-1',
      organizationId: 'organization-1',
    });
    assert.equal(conversation.response.statusCode, 201);

    const created = await call('POST', `/api/v1/conversations/${conversation.body.id}/messages`, patient, {
      clientRequestId: 'client-message-1',
      content: 'Please contact +90 (532) 123-45-67',
    });
    assert.equal(created.response.statusCode, 201);

    const duplicate = await call('POST', `/api/v1/conversations/${conversation.body.id}/messages`, patient, {
      clientRequestId: 'client-message-1',
      content: 'Please contact +90 (532) 123-45-67',
    });
    assert.equal(duplicate.response.statusCode, 201);
    assert.equal(duplicate.body.id, created.body.id);

    const participantMessages = await call('GET', `/api/v1/conversations/${conversation.body.id}/messages`, patient);
    assert.equal(participantMessages.response.statusCode, 200);
    assert.equal(participantMessages.body[0].content, 'Please contact +90 (532) 123-45-67');
    assert.equal('previousContent' in participantMessages.body[0], false);

    const edited = await call('PATCH', `/api/v1/messages/${created.body.id}`, patient, {
      expectedRevision: 1,
      content: 'Updated message without contact details',
    });
    assert.equal(edited.response.statusCode, 200);
    assert.equal(edited.body.edited, true);

    const participantAfterEdit = await call('GET', `/api/v1/conversations/${conversation.body.id}/messages`, patient);
    assert.equal(participantAfterEdit.body[0].content, 'Updated message without contact details');
    assert.equal(participantAfterEdit.body.some((item: { content: string }) => item.content.includes('+90')), false);

    const stale = await call('PATCH', `/api/v1/messages/${created.body.id}`, patient, {
      expectedRevision: 1,
      content: 'This must conflict',
    });
    assert.equal(stale.response.statusCode, 409);
    assert.equal(stale.body.code, 'STALE_MESSAGE_REVISION');

    const revisions = await call('GET', `/api/v1/admin/conversations/${conversation.body.id}/revisions`, admin);
    assert.equal(revisions.response.statusCode, 200);
    assert.equal(revisions.body[0].revisions.length, 2);
    assert.equal(revisions.body[0].revisions[1].previousContent, 'Please contact +90 (532) 123-45-67');

    const flags = await call('GET', '/api/v1/admin/risk-flags', admin);
    assert.equal(flags.response.statusCode, 200);
    assert.equal(flags.body.some((flag: { category: string }) => flag.category === 'CONTACT_PHONE'), true);

    const audits = await call('GET', '/api/v1/admin/audit-events', admin);
    const eventTypes = audits.body.map((event: { eventType: string }) => event.eventType);
    assert.equal(eventTypes.includes('MESSAGE_CREATED'), true);
    assert.equal(eventTypes.includes('MESSAGE_EDITED'), true);
    assert.equal(eventTypes.includes('ADMIN_REVISIONS_VIEWED'), true);
    assert.equal(eventTypes.includes('RISK_FLAG_CREATED'), true);
  });

  it('handles unicode/word-digit screening, case workflow, follow-up conflict and notice idempotency', async () => {
    const patient: Actor = { id: 'patient-2', type: 'PATIENT' };
    const clinician: Actor = { id: 'clinician-2', type: 'CLINICIAN', organizationId: 'organization-2' };
    const admin: Actor = { id: 'admin-2', type: 'SUPER_ADMIN' };
    const conversation = await call('POST', '/api/v1/conversations', patient, {
      patientId: patient.id,
      clinicianId: clinician.id,
      organizationId: clinician.organizationId,
      leadId: 'lead-2',
    });
    const message = await call('POST', `/api/v1/conversations/${conversation.body.id}/messages`, patient, {
      clientRequestId: 'client-message-2',
      content: 'sıfır beş üç iki bir iki üç dört beş altı yedi',
    });
    assert.equal(message.response.statusCode, 201);

    const unicodeMessage = await call('POST', `/api/v1/conversations/${conversation.body.id}/messages`, patient, {
      clientRequestId: 'client-message-2-unicode',
      content: 'Call ٠٥٣٢١٢٣٤٥٦٧',
    });
    assert.equal(unicodeMessage.response.statusCode, 201);

    const flags = await call('GET', '/api/v1/admin/risk-flags', admin);
    const flag = flags.body.find((item: { messageId: string }) => item.messageId === message.body.id);
    assert.ok(flag);
    assert.equal(flag.category, 'OBFUSCATED_CONTACT');
    assert.equal(flag.evidenceMasked, '[obfuscated_contact]');
    assert.equal(flags.body.some((item: { messageId: string; category: string }) => item.messageId === unicodeMessage.body.id && item.category === 'CONTACT_PHONE'), true);

    const decided = await call('PATCH', `/api/v1/admin/risk-flags/${flag.id}/decision`, admin, {
      status: 'FALSE_POSITIVE',
      reason: 'Reviewed by admin',
    });
    assert.equal(decided.response.statusCode, 200);

    const createdCase = await call('POST', `/api/v1/conversations/${conversation.body.id}/cases`, clinician, {
      type: 'SUPPORT',
      category: 'FOLLOW_UP',
      description: 'Patient requested support',
      messageId: message.body.id,
    });
    assert.equal(createdCase.response.statusCode, 201);
    const updatedCase = await call('PATCH', `/api/v1/admin/cases/${createdCase.body.id}`, admin, {
      status: 'RESOLVED',
      resolutionNote: 'Handled',
    });
    assert.equal(updatedCase.response.statusCode, 200);

    const followUp = await call('POST', '/api/v1/admin/follow-ups', admin, {
      leadId: 'lead-2',
      conversationId: conversation.body.id,
      target: 'BOTH',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const patientAnswer = await call('POST', `/api/v1/follow-ups/${followUp.body.id}/answers`, patient, { answer: 'YES' });
    assert.equal(patientAnswer.body.status, 'OPEN');
    const clinicianAnswer = await call('POST', `/api/v1/follow-ups/${followUp.body.id}/answers`, clinician, { answer: 'NO' });
    assert.equal(clinicianAnswer.body.status, 'CONFLICT');

    const noNotice = await call('POST', '/api/v1/admin/notices/decision', admin, {
      sourceType: 'RISK_FLAG',
      sourceId: flag.id,
      sendNotice: 'NO',
    });
    assert.equal(noNotice.body.status, 'NOT_SENT');
    const notice = await call('POST', '/api/v1/admin/notices/decision', admin, {
      sourceType: 'RISK_FLAG',
      sourceId: flag.id,
      organizationId: clinician.organizationId,
      sendNotice: 'YES',
    });
    assert.equal(notice.body.status, 'SENT');
    assert.equal(notice.body.attempts, 1);
    const retry = await call('POST', `/api/v1/admin/notices/${notice.body.id}/retry`, admin);
    assert.equal(retry.body.attempts, 1);
  });
});
