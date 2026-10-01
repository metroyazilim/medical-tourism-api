# SPEC-002–007 — Platform ve domain implementation kaydı

**Tarih:** 1 Ekim 2026  
**Durum:** İlk executable backend slice tamamlandı; production provider entegrasyonları açık.

## Uygulanan sınırlar

- `src/platform`: typed environment config, liveness/readiness/version health,
  graceful shutdown hook, UUID üretimi, ortak store ve `/api/v1` modül sınırı.
- `src/identity`: actor-header adapter üzerinde session oluşturma/listeleme/
  revoke, Firebase provider değer allowlist’i, genel consent, invite membership
  pending→active/revoke ve account deletion request/cancel.
- `src/patient`: private profile/preferences, completion state ve
  ISO-3166 alpha-2, BCP47-like locale, ISO4217 currency validation.
- `src/directory`: super-admin katalog yönetimi; organization publication
  state transition, verification expiry, doctor publication/verification,
  treatment catalog, treatment link ve public-safe detail/list guard’ları.
- `src/discovery`: anonymous organization/doctor/treatment discovery,
  allowlisted filters, accent/case normalization, opaque query-bound cursor ve
  patient-only private idempotent favorites.
- `src/inquiry`: structured draft/submit/cancel/close, current general consent,
  1–3 distinct eligible organizations, organization başına Lead/grant,
  membership + grant isolation, assignment accept/decline, optimistic lead
  version, idempotent transition, append-only timeline, revoke/reassign ve
  yedi gün inactivity follow-up oluşturma.

## Uygulama kararları

- HTTP base path `/api/v1`; hata yüzeyi RFC 9457-shaped güvenli Problem Details.
- Bu slice dış bağımlılık gerektirmeyen in-memory adapter kullanır. Bu karar
  production PostgreSQL/Prisma persistence yerine geçmez.
- Actor-header adapter local/test sınırındadır; gerçek Firebase token validation,
  validation cache ve provider project kurulumu açık implementation işidir.
- Follow-up mevcut messaging modülündeki `IN_APP` modeliyle oluşturulur;
  gerçek notification/outbox teslimi SPEC-011’e bırakılır.
- Public entity state’leri ve patient verisi birbirinden ayrı tutulur; public
  projection membership, evidence, audit veya health data açmaz.

## Değişen ana dosyalar

- `src/platform/*`, `src/identity/*`, `src/patient/*`, `src/directory/*`,
  `src/discovery/*`, `src/inquiry/*`
- `src/app.module.ts`, `src/main.ts`, `src/platform/platform.types.ts`,
  `src/platform/platform.store.ts`
- `test/platform-and-specs-002-007.e2e.test.ts`

## Açık işler

- Prisma schema/migrations ve PostgreSQL adapter’ı.
- Firebase token validation/cache, rate limit/brute-force/replay controls.
- Location/evidence/versioned directory audit ayrıntıları.
- BullMQ/Redis job adapter, notification outbox/provider, Pino/Loki/Grafana,
  Docker/Dokploy/OpenBao ve CI deployment gates.
- UI oluşturulduğunda Playwright gerçek kullanıcı akışları.
