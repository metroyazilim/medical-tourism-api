# SPEC-008 — Özel Dosya Depolama ve Yetkili Erişim

- **Durum:** Accepted — implementation slice başlatıldı
- **Tarih:** 1 Ekim 2026
- **Tür:** Private file metadata, upload, scan and authorized access specification
- **Bağımlılık:** SPEC-002, SPEC-003, SPEC-007
- **Storage baseline:** Private object-storage port; public URL yok
- **MVP güvenlik:** Metadata-first, MIME/size/checksum validation, quarantine until scan

## 1. Amaç

Hasta, organization ve verification bağlamındaki dosyaları public erişime açmadan
yüklemek, taramak, paylaşım grant’iyle sınırlandırmak ve her indirmede güncel
yetkiyi yeniden kontrol etmek.

## 2. Kapsam

### 2.1 Kapsam içinde

- Upload intent ve tamamlanma metadata’sı.
- Inquiry/lead/message/verification kullanım bağlamı.
- MIME, boyut, dosya adı, checksum ve attachment reference doğrulaması.
- `PENDING_SCAN → AVAILABLE | QUARANTINED | REJECTED` yaşam döngüsü.
- Patient ownership, active grant, organization assignment ve admin policy kontrolleri.
- Kısa ömürlü download reference; permanent public URL yasağı.
- Idempotent upload completion, audit reference ve retention hook.

### 2.2 Kapsam dışı

- Gerçek S3/MinIO sağlayıcısı veya production malware engine kurulumu.
- Resumable/chunk upload ve video transcoding.
- OCR, tıbbi içerik sınıflandırması veya AI analizi.
- Legal retention sürelerinin nihai kararı; SPEC-012 policy’si.

## 3. Kabul kararları

| Karar | Accepted seçim |
| --- | --- |
| Public erişim | Yok; indirme anında authorization |
| State | `PENDING_SCAN`, `AVAILABLE`, `QUARANTINED`, `REJECTED`, `DELETED` |
| Default limit | 10 MiB; allowlist PDF/JPEG/PNG/WEBP |
| Ownership | Patient, assigned organization veya super admin policy |
| Storage | Port/interface; mevcut slice in-memory adapter |
| Security | Raw bytes, secret ve signed URL loglanmaz |

## 4. Aktör ve yetki matrisi

| Aktör | Upload | Metadata | Download | Delete |
| --- | --- | --- | --- | --- |
| Patient | Kendi inquiry/lead bağlamı | Kendi veya grant kapsamı | Grant ve state geçerliyse | Kendi pending/owned dosyası |
| Organization member | Assigned lead ve capability | Kendi assignment’ı | Active grant + assignment | Kendi yüklediği pending dosya |
| Super admin | Policy ile | Tümü, audit ile | `AVAILABLE` dosya | Retention/admin policy |
| System worker | Scan/retention | Metadata only | Yok | Retention policy |

## 5. Veri modeli

`Attachment`: id, owner actor reference, context type/id, lead/inquiry reference,
opaque storage key, safe filename, MIME, size, checksum, scan state, created/
scanned/deleted timestamps, allowed grant references ve version.

Binary içerik audit/log/context’e kopyalanmaz. Storage key public response’a
verilmez.

## 6. API grupları

- `POST /api/v1/files/upload-intents`
- `POST /api/v1/files/:id/complete`
- `GET /api/v1/files/:id`
- `GET /api/v1/files/:id/download`
- `POST /api/v1/files/:id/delete`
- `POST /api/v1/admin/files/:id/scan-result`

Tüm protected operation’lar `/api/v1`, actor, request ID, Problem Details ve
current ownership/grant kontrolünü kullanır.

## 7. Validation, conflict ve audit

- Unknown usage/context reddedilir.
- Unsupported MIME, size overflow, checksum mismatch ve invalid state `400/413/415/409` mapping’iyle döner.
- Completion aynı idempotency key ile duplicate binary/reference üretmez.
- `PENDING_SCAN` dosya indirilemez.
- Grant revoke sonrası yeni download güvenli `403/404` olur.
- Upload intent, completion, scan decision, download ve delete audit referansı üretir.

## 8. Kabul kriterleri

1. Public URL veya storage key açığa çıkmaz.
2. Unscanned/quarantined dosya indirilemez.
3. Patient başka patient dosyasını göremez.
4. Organization yalnız active membership + assignment + grant ile okuyabilir.
5. MIME/size/checksum ve idempotency kuralları hedefli testlerle doğrulanır.
6. Secret, raw bytes veya sağlık belgesi içeriği teknik loglara yazılmaz.

## 9. Bağımlılıklar ve açık işler

Production object storage, malware scanner, signed URL provider, retention job ve
resumable upload implementation kaydı sonraki operasyon entegrasyonudur.

## 10. Doğrulama planı

Upload intent, completion, scan sonucu, authorized download, grant revoke,
quarantine ve duplicate completion senaryoları API/e2e testleriyle doğrulanır.
