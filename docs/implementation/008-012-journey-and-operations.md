# SPEC-008–012 — Journey ve operations implementation kaydı

**Tarih:** 1 Ekim 2026  
**Durum:** İlk executable slices tamamlandı; production provider seam’leri açık.

## Uygulanan modüller

- `src/files`: private attachment metadata, upload intent, 10 MiB/MIME allowlist,
  checksum, pending-scan/quarantine/available state, grant-aware metadata/download
  authorization ve admin/worker scan sonucu.
- `src/quote`: minor-unit + ISO 4217 quote items, draft/update/publish/withdraw,
  patient accept/reject, expiry, stale version ve idempotency.
- `src/appointment`: RFC3339/UTC + IANA timezone, overlap guard, propose/confirm/
  reschedule/cancel/complete/no-show ve append-only journey events.
- `src/notification`: private in-app center, channel preferences, safe template
  references, recipient isolation, deduplication, read ve bounded retry seam’i.
- `src/privacy`: privacy request/cancel/anonymize, profile/preferences/consent/
  favorite/grant cleanup, platform audit reference, operations checks ve release gate.

## Güvenlik ve veri kararları

- Raw binary, storage key, provider secret, raw message/revision, health detail veya
  token response/log yüzeyine girmez.
- Public file URL yoktur; download authorization her istekte tekrar yapılır.
- Provider/object storage/queue yoksa sistem bunu `NOT_CONFIGURED` veya açık
  in-memory adapter olarak raporlar; gerçek production teslimi iddia edilmez.
- Quote acceptance payment veya lead terminal state anlamına gelmez; payment/journey
  kararları ayrı sınırda tutulur.
- Anonymization audit event’i korur, kullanıcıya ait profile/preferences/favorites
  ve aktif grant erişimini kaldırır.

## Değişen ana dosyalar

- `src/files/*`, `src/quote/*`, `src/appointment/*`, `src/notification/*`,
  `src/privacy/*`
- `src/platform/platform.types.ts`, `src/platform/platform.store.ts`,
  `src/app.module.ts`
- `test/specs-008-012.e2e.test.ts`
- `docs/specs/008-*.md`–`docs/specs/012-*.md`, `docs/spec-roadmap.md`,
  `CONTEXT.md`, `scripts/agent-memory-check.sh`

## Açık production işleri

- Prisma schema/migration ve PostgreSQL persistence.
- Firebase token validation/cache ve auth abuse controls.
- S3/MinIO/private object storage, malware scanner ve signed URL adapter.
- BullMQ/Redis outbox worker, email/push provider ve retry/dead-letter runtime.
- Backup/PITR/restore, OpenBao/Dokploy, Pino/Loki/Grafana ve CI release gates.
