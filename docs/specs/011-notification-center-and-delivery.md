# SPEC-011 — Bildirim Merkezi ve Teslim

- **Durum:** Accepted — implementation slice başlatıldı
- **Tarih:** 1 Ekim 2026
- **Tür:** Notification preference, in-app event and delivery outbox specification
- **Bağımlılık:** SPEC-002, SPEC-003
- **Delivery baseline:** In-app authoritative; push/email ports optional

## 1. Amaç ve kapsam

Quote, appointment, message, follow-up ve security olaylarını güvenli biçimde
bildirim merkezine yazmak; kullanıcı tercihlerine, idempotency’ye ve retry
sınırlarına uymak.

Kapsam: notification event, channel preference, read/unread, outbox status,
bounded retry, deduplication ve audit. Notification body raw health/message
content taşımaz; safe template reference kullanır.

Kapsam dışı: gerçek e-posta/SMS/push provider kurulumu, marketing campaign,
WhatsApp ve delivery SLA.

## 2. Aktör ve veri modeli

Patient/organization actor yalnız kendi notification’larını görür. Admin global
operasyon/failed delivery özetini görebilir; provider secret veya raw payload göremez.

`Notification`: id, recipient, category, channel, safe template/data reference,
status, readAt, attempts, idempotency key, created/sent/failed timestamps.
`NotificationPreference`: category→allowed channels; security zorunlu olayları
tercihle susturulamaz.

## 3. API grupları

- `GET /api/v1/notifications`
- `POST /api/v1/notifications/:id/read`
- `GET /api/v1/notification-preferences`
- `PATCH /api/v1/notification-preferences`
- `POST /api/v1/system/notifications` (system worker)
- `POST /api/v1/admin/notifications/:id/retry`
- `GET /api/v1/admin/notifications/failed`

## 4. Kurallar

- `(recipient, category, sourceId, idempotencyKey)` duplicate üretmez.
- Retry yalnız transient failure’da, bounded attempts ve exponential metadata ile yapılır.
- Validation/auth/conflict kalıcı failed state’e gider; otomatik retry edilmez.
- In-app kayıt source state’den önce kaybolmayacak şekilde outbox adapter ile ilişkilendirilir.
- Notification listeleri limit/cursor kullanır.
- Raw message, health detail, document bytes, token veya secret notification’a girmez.

## 5. Kabul kriterleri

1. Kullanıcı başka kullanıcı notification’ını göremez.
2. Preference allowed channels ile güvenli biçimde uygulanır.
3. Aynı event duplicate notification üretmez.
4. Read, retry ve failed list authorization ile korunur.
5. In-app adapter test edilir; provider entegrasyonu açık interface olarak kalır.

## 6. Doğrulama planı

Create/dedup/list/read/preferences/retry, recipient isolation, bounded retry ve
secret/raw payload redaction hedefli testlerle doğrulanır.
