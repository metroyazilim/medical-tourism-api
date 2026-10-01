# SPEC-012 — Gizlilik, Hesap Silme, Audit ve Operasyonel Hazırlık

- **Durum:** Accepted — implementation slice başlatıldı
- **Tarih:** 1 Ekim 2026
- **Tür:** Privacy, anonymization, audit, retention and release-readiness specification
- **Bağımlılık:** Tüm ilgili spec’ler
- **Operational baseline:** Secure audit references, redacted logs, backup/restore gate

## 1. Amaç ve kapsam

Hasta verisinin private-by-default tutulmasını, deletion/anonymization taleplerinin
field-level policy ile uygulanmasını, audit kayıtlarının güvenli erişimini ve
release/backup/readiness kontrollerinin raporlanmasını sağlamak.

## 2. Kapsam içinde

- Account deletion request/cancel/execute ve field-level anonymization.
- Legal/audit referanslarını pseudonymous koruma.
- Audit event append-only query ve admin authorization.
- Retention policy evaluation; silme kararını audit reference ile kaydetme.
- Log redaction policy ve secret/raw content yasağı.
- Backup/restore/release gate health metadata’sı.

## 3. Kapsam dışı

- Hukuki retention sürelerinin ülke bazlı nihai kararı.
- Gerçek backup provider, PITR cluster veya OpenBao kurulumu.
- Remote SIEM/SOC entegrasyonu.
- Kullanıcıya raw audit veya başka kişinin PII export’u.

## 4. Veri ve yetki modeli

`PrivacyRequest`: actor, state `REQUESTED|CANCELLED|ANONYMIZED`, policyVersion,
requested/completed timestamps ve safe reason code.
`PlatformAuditEvent`: actor/entity/action, requestId, safe metadata, createdAt;
raw message, revision, document, health data, token ve secret taşımaz.
`OperationsCheck`: check name, status, observedAt, safe detail code.

Patient kendi privacy request state’ini; super admin policy’ye uygun aggregate
audit/ops özetlerini görür. Worker yalnız policy-defined anonymization/retention
işlemini yapar.

## 5. API grupları

- `GET /api/v1/privacy/request`
- `POST /api/v1/privacy/request`
- `POST /api/v1/privacy/request/cancel`
- `POST /api/v1/admin/privacy/:actorId/anonymize`
- `GET /api/v1/admin/platform-audit-events`
- `GET /api/v1/admin/operations/checks`
- `GET /api/v1/admin/operations/retention-preview`
- `POST /api/v1/admin/operations/release-gate`
- `GET /health/live`, `/health/ready`, `/health/version`

## 6. Kurallar

- Anonymization profile direct PII, preferences, favorites and active grants’i
  policy’ye göre temizler; audit referansları opaque/pseudonymous kalır.
- Audit append-only’dir; correction yeni event üretir, overwrite/delete yoktur.
- Retention evaluator yalnız expired ve policy-eligible kayıtları hedefler.
- Release gate migration/config/health/test evidence olmadan `PASS` vermez.
- Backup/restore check gerçek backup çalıştırmış gibi rapor üretmez; provider
  yoksa `NOT_CONFIGURED` döner.
- Logs structured/redacted olur; raw user content ve secret asla yazılmaz.

## 7. Kabul kriterleri

1. Deletion execution sonrası profile/preferences/favorite erişimi anonymized olur.
2. Audit/legal referansları sessizce silinmez.
3. Admin dışı audit ve ops yüzeylerini göremez.
4. Release gate eksik provider/test kanıtını `NOT_READY` olarak raporlar.
5. Backup/restore ve retention status güvenli, hassasiyetsiz metadata döndürür.
6. Raw secret, token, document, message/revision veya health content audit/log’a girmez.

## 8. Doğrulama planı

Privacy request lifecycle, anonymization, audit access isolation, retention preview,
ops checks, release-gate failure/pass criteria ve redaction hedefli testlerle
doğrulanır.
