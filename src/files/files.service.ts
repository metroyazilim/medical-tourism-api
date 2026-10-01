import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../messaging/messaging.types';
import { problem } from '../common/http';
import { PlatformStore } from '../platform/platform.store';
import { Attachment, AttachmentContext } from '../platform/platform.types';

const allowedMime = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const maxSize = 10 * 1024 * 1024;

@Injectable()
export class FilesService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}

  private audit(actor: Actor, action: string, entityId: string) {
    this.store.platformAudits.push({ id: this.store.id(), actorId: actor.id, actorType: actor.type, action, entityType: 'Attachment', entityId, requestId: 'files-request', metadata: {}, createdAt: this.store.now() });
  }

  private leadAccess(actor: Actor, leadId: string, mutate = false) {
    const lead = this.store.leads.get(leadId); if (!lead || lead.state === 'REVOKED') throw problem(404, 'LEAD_NOT_FOUND', 'Lead was not found');
    const inquiry = this.store.inquiries.get(lead.inquiryId); if (!inquiry) throw problem(404, 'INQUIRY_NOT_FOUND', 'Inquiry was not found');
    if (actor.type === 'SUPER_ADMIN') return { lead, inquiry };
    if (actor.type === 'PATIENT' && actor.id === inquiry.patientId) return { lead, inquiry };
    const member = [...this.store.memberships.values()].find((item) => item.actorId === actor.id && item.organizationId === lead.organizationId && item.state === 'ACTIVE');
    const grant = [...this.store.grants.values()].find((item) => item.leadId === lead.id && item.active);
    if (actor.type === 'CLINICIAN' && member && grant && (!mutate || member.role !== 'VIEWER')) return { lead, inquiry };
    throw problem(403, 'FORBIDDEN', 'Lead file access is not available');
  }

  createIntent(actor: Actor, input: { contextType: AttachmentContext; contextId: string; filename: string; mimeType: string; size: number; checksum: string; idempotencyKey?: string }) {
    if (!allowedMime.has(input.mimeType)) throw problem(415, 'UNSUPPORTED_FILE_TYPE', 'File type is not supported');
    if (input.size < 1 || input.size > maxSize) throw problem(413, 'FILE_TOO_LARGE', 'File size is outside the allowed range');
    let leadId: string | undefined; let inquiryId: string | undefined;
    if (input.contextType === 'LEAD') { const access = this.leadAccess(actor, input.contextId); leadId = access.lead.id; inquiryId = access.inquiry.id; }
    else if (input.contextType === 'INQUIRY') { const inquiry = this.store.inquiries.get(input.contextId); if (!inquiry || (actor.type !== 'SUPER_ADMIN' && inquiry.patientId !== actor.id)) throw problem(404, 'INQUIRY_NOT_FOUND', 'Inquiry was not found'); inquiryId = inquiry.id; }
    else if (input.contextType === 'VERIFICATION' && actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Verification file upload is restricted');
    if (input.idempotencyKey) { const existing = [...this.store.attachments.values()].find((item) => item.ownerId === actor.id && item.idempotencyKey === input.idempotencyKey); if (existing) return existing; }
    const item: Attachment = { id: this.store.id(), ownerId: actor.id, contextType: input.contextType, contextId: input.contextId, leadId, inquiryId, filename: input.filename.replace(/[^\w. -]/gu, '').slice(0, 160) || 'attachment', mimeType: input.mimeType, size: input.size, checksum: input.checksum, storageKey: `private/${this.store.id()}`, state: 'PENDING_SCAN', version: 1, idempotencyKey: input.idempotencyKey, createdAt: this.store.now() };
    this.store.attachments.set(item.id, item); this.audit(actor, 'ATTACHMENT_INTENT_CREATED', item.id); return item;
  }

  complete(actor: Actor, id: string, checksum: string) {
    const item = this.get(actor, id); if (item.ownerId !== actor.id && actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Only the uploader can complete this attachment');
    if (item.state !== 'PENDING_SCAN') throw problem(409, 'ATTACHMENT_NOT_PENDING', 'Attachment is no longer pending scan');
    if (item.checksum !== checksum) throw problem(409, 'CHECKSUM_MISMATCH', 'Attachment checksum does not match');
    this.audit(actor, 'ATTACHMENT_COMPLETED', id); return item;
  }

  scan(actor: Actor, id: string, state: 'AVAILABLE' | 'QUARANTINED' | 'REJECTED') {
    if (actor.type !== 'SUPER_ADMIN' && actor.type !== 'SYSTEM_WORKER') throw problem(403, 'FORBIDDEN', 'Scan result requires an admin or worker');
    const item = this.store.attachments.get(id); if (!item) throw problem(404, 'ATTACHMENT_NOT_FOUND', 'Attachment was not found');
    if (item.state !== 'PENDING_SCAN') throw problem(409, 'ATTACHMENT_NOT_PENDING', 'Attachment is no longer pending scan');
    item.state = state; item.scannedAt = this.store.now(); item.version += 1; this.audit(actor, 'ATTACHMENT_SCAN_RESULT', id); return item;
  }

  get(actor: Actor, id: string): Attachment {
    const item = this.store.attachments.get(id); if (!item) throw problem(404, 'ATTACHMENT_NOT_FOUND', 'Attachment was not found');
    if (item.leadId) this.leadAccess(actor, item.leadId);
    else if (item.ownerId !== actor.id && actor.type !== 'SUPER_ADMIN') throw problem(404, 'ATTACHMENT_NOT_FOUND', 'Attachment was not found');
    return item;
  }

  download(actor: Actor, id: string) {
    const item = this.get(actor, id); if (item.state !== 'AVAILABLE') throw problem(409, 'ATTACHMENT_NOT_AVAILABLE', 'Attachment is not available for download');
    this.audit(actor, 'ATTACHMENT_DOWNLOAD_AUTHORIZED', id);
    return { attachmentId: item.id, filename: item.filename, mimeType: item.mimeType, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), access: 'short-lived-reference' };
  }

  delete(actor: Actor, id: string) {
    const item = this.get(actor, id); if (item.ownerId !== actor.id && actor.type !== 'SUPER_ADMIN') throw problem(403, 'FORBIDDEN', 'Only the owner or admin can delete this attachment');
    if (item.state === 'AVAILABLE' && actor.type !== 'SUPER_ADMIN') throw problem(409, 'ATTACHMENT_RETENTION_LOCK', 'Available attachments require retention policy deletion');
    item.state = 'DELETED'; item.deletedAt = this.store.now(); item.version += 1; this.audit(actor, 'ATTACHMENT_DELETED', id); return { id, state: item.state };
  }
}
