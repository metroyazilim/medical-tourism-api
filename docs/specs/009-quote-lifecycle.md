# SPEC-009 — Teklif Yaşam Döngüsü

- **Durum:** Accepted — implementation slice başlatıldı
- **Tarih:** 1 Ekim 2026
- **Tür:** Quote lifecycle and monetary representation specification
- **Bağımlılık:** SPEC-007
- **Money baseline:** Integer minor unit + ISO 4217; floating point yok

## 1. Amaç ve kapsam

Yetkili organization’ın izole lead üzerinde teklif taslağı hazırlaması, yayımlaması,
hastanın kabul/reddetmesi ve expiry/concurrency kararlarının denetlenebilir olması.

Kapsam: quote draft, bounded line items, publish, withdraw, expiry, patient
accept/reject, optimistic version, idempotency ve lead timeline reference.

Kapsam dışı: ödeme, fatura, komisyon, vergi hesaplama, currency conversion ve
payment provider.

## 2. State ve yetki

Quote state’leri: `DRAFT`, `PUBLISHED`, `EXPIRED`, `ACCEPTED`, `REJECTED`,
`WITHDRAWN`.

Organization owner/admin/editor draft düzenler ve publish eder. Viewer mutate
edemez. Patient kendi lead’ine ait published teklifi kabul/reddeder. Super admin
review/revoke policy’sine sahiptir.

## 3. Veri modeli

`Quote`: id, lead/inquiry/organization reference, version, currency, subtotal,
line items, validity end, state, created/published/decided timestamps, actor and
reason references. `QuoteItem` yalnız bounded public-safe description, quantity,
minor-unit amount ve inclusion flag taşır.

## 4. API grupları

- `POST /api/v1/leads/:leadId/quotes`
- `PATCH /api/v1/quotes/:id`
- `POST /api/v1/quotes/:id/publish`
- `POST /api/v1/quotes/:id/withdraw`
- `GET /api/v1/leads/:leadId/quotes`
- `GET /api/v1/quotes/:id`
- `POST /api/v1/quotes/:id/accept`
- `POST /api/v1/quotes/:id/reject`
- `POST /api/v1/admin/quotes/:id/expire`

## 5. Kurallar

- Currency uppercase ISO 4217 biçimindedir; amount integer ve negatif değildir.
- Publish için en az bir kalem, geçerli expiry ve authorized organization gerekir.
- Aynı lead’de ikinci quote kabulü `409` üretir.
- Stale version `409`; aynı idempotency key aynı sonucu döndürür.
- Accepted quote lead’i `CLOSED_WON` yapmaz; treatment journey kararı ayrı spec’tedir.
- Her mutation append-only timeline/audit reference üretir.

## 6. Kabul kriterleri

1. Patient başka lead quote’unu göremez.
2. Organization yalnız kendi active assignment/grant kapsamındaki lead’e quote yazar.
3. Published olmayan quote patient’a dönmez.
4. Expired/withdrawn quote kabul edilemez.
5. Minor-unit para temsili ve stale conflict test edilir.
6. Ödeme veya provider çağrısı bu spec’te yapılmaz.

## 7. Doğrulama planı

Draft/update/publish/list/detail/accept/reject/expire, authorization isolation,
duplicate acceptance, stale version ve idempotency hedefli API testleriyle doğrulanır.
