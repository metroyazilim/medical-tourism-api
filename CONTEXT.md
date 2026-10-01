# Medical Tourism — kısa proje context’i

## Mevcut durum

Proje spec aşamasından SPEC-001–012 executable backend slice aşamasına geçti.
NestJS 11/Fastify 5 + TypeScript modülleri, HTTP endpoint’leri ve hedefli
testler vardır. SPEC-001 implementation kaydı
`docs/implementation/001-message-governance.md`; SPEC-002–007 kaydı
`docs/implementation/002-007-platform-and-domain.md` dosyalarındadır.
SPEC-008–012 kaydı `docs/implementation/008-012-journey-and-operations.md`
dosyasındadır.
Local çalıştırma, env ve yapılabilen/yapılamayan akışlar
`docs/local-development.md` içindedir; güvenli örnek env
`.env.example` dosyasıdır.

PostgreSQL/Prisma persistence, gerçek Firebase token adapter’ı ve notification
provider’ı henüz kurulmadı. Feature adapter’ları dış bağımlılık olmadan hedefli
doğrulama için in-memory store kullanır; bu production persistence olarak
raporlanmaz.

## Spec kapsamı ve uygulama sırası

Spec-001–012 Accepted ürün/foundation sınırlarını tanımlar; mevcut runtime
slice’ları aşağıdaki sırayla uygulanmıştır:

1. Mesaj yönetişimi, deterministik screening, complaint/support ve follow-up.
2. Modüler monolith foundation ve ortak API/operasyon sözleşmesi.
3. Kimlik, session, genel rıza, membership ve roller.
4. Hasta profili, locale/ülke/para birimi ve iletişim tercihleri.
5. Kuruluş, location, doctor, treatment catalog, verification/publication.
6. PostgreSQL-first discovery, allowlisted filters, cursor pagination ve
   patient favorites.
7. Treatment inquiry, en fazla üç organization Lead’i, explicit grant,
   assignment, state history ve 7 günlük bilateral follow-up.
8. Özel dosya metadata/upload intent, scan quarantine ve authorized download.
9. Quote draft/publish/expire/accept/reject ve minor-unit money.
10. Timezone-aware appointment state machine ve journey timeline.
11. In-app notification, preferences, deduplication ve retry/outbox seam’i.
12. Privacy request/anonymization, audit, retention/ops checks ve release gate.

Kaynak dosyalar:

- `docs/specs/001-message-governance-and-lead-follow-up.md`
- `docs/specs/002-platform-foundation-and-modular-monolith.md`
- `docs/specs/003-identity-session-consent-and-roles.md`
- `docs/specs/004-patient-profile-and-preferences.md`
- `docs/specs/005-organization-doctor-treatment-verification.md`
- `docs/specs/006-discovery-search-filters-and-favorites.md`
- `docs/specs/007-treatment-inquiry-lead-assignment-and-history.md`
- `docs/specs/008-private-file-storage-and-authorized-access.md`
- `docs/specs/009-quote-lifecycle.md`
- `docs/specs/010-appointment-and-treatment-journey.md`
- `docs/specs/011-notification-center-and-delivery.md`
- `docs/specs/012-privacy-account-deletion-audit-operations.md`

## Teknik baseline

Spec’lerdeki Accepted foundation: Node 22 LTS + TypeScript, NestJS 11/Fastify
5, pnpm 10, PostgreSQL + Prisma 6, versioned HTTP ve RFC 9457 JSON Problem
Details, UUID/Zod/cursor pagination, Firebase Authentication, BullMQ + Redis,
Docker/Dokploy, runtime secret references, idempotent jobs, structured
observability, PII redaction ve PostgreSQL audit. Bu baseline henüz kurulmuş
bir uygulama anlamına gelmez.

## Sınırlar ve açık kararlar

- Sağlık turizmi platformu bağlamı; hasta, organization, doctor, treatment,
  discovery, inquiry/lead, messaging, audit ve privacy sınırları spec’lerde
  tanımlıdır.
- AI/model tabanlı mesaj moderation’ı ve concierge mevcut MVP’de yoktur.
- Gerçek PostgreSQL/Prisma, Firebase, object storage, delivery provider ve
  queue entegrasyonları ayrıca production implementation işi olarak açıktır.
- Spec’lerdeki Unknown/Proposed kararlar kullanıcı onayı olmadan Accepted
  yapılmaz.

## Agent handoff

Kod kökü `/Users/berat/medical-tourism/medical-tourism`, ayrı Medical Tourism
brain vault’u `/Users/berat/medical-tourism/medical-tourism-brain`’dir.
Kalıcı teknik kararlar ve ilerleme brain vault’undaki
`90-Agent Context/Agent Context.md`, `50-Journal/Current State.md` ve
`Proje Özeti.md` içine yazılır. Ventura Brain’e veya başka global brain’e
yazılmaz. Secret, token, şifre, ham `.env`, sağlık, mesaj, revision veya belge
içeriği hafızaya yazılmaz.
