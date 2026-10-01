# SPEC-010 — Randevu ve Tedavi Yolculuğu

- **Durum:** Accepted — implementation slice başlatıldı
- **Tarih:** 1 Ekim 2026
- **Tür:** Timezone-aware appointment and journey timeline specification
- **Bağımlılık:** SPEC-007, SPEC-009
- **Time baseline:** RFC3339 timestamp + IANA timezone; DB UTC adapter sınırı

## 1. Amaç ve kapsam

Patient ve organization’ın lead’e bağlı randevuyu teklif etmesi, onaylaması,
yeniden planlaması/iptal etmesi ve treatment journey olaylarını append-only
timeline ile izlemesi.

Kapsam: appointment proposal, confirm, reschedule, cancel, complete/no-show,
optimistic version, overlap guard ve journey events.

Kapsam dışı: video provider, uçuş/otel rezervasyonu, payment ve medical advice.

## 2. State ve yetki

State’ler: `PROPOSED`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `CANCELLED`,
`COMPLETED`, `NO_SHOW`.

Patient ve assigned organization actor kendi yetki sınırında propose/reschedule/
cancel eder. Organization confirm eder; super admin policy override’ı audit edilir.
Terminal appointment reopen varsayılan olarak yoktur.

## 3. Veri modeli

`Appointment`: id, lead/inquiry reference, organization, optional doctor,
start/end UTC, IANA timezone, state, version, actor/reason references.
`JourneyEvent`: id, lead/inquiry reference, safe event type, actor, occurredAt,
related appointment/quote reference ve aggregate version. Medical diagnosis veya
raw health note journey event’e yazılmaz.

## 4. API grupları

- `POST /api/v1/leads/:leadId/appointments`
- `GET /api/v1/leads/:leadId/appointments`
- `POST /api/v1/appointments/:id/confirm`
- `POST /api/v1/appointments/:id/reschedule`
- `POST /api/v1/appointments/:id/cancel`
- `POST /api/v1/appointments/:id/complete`
- `POST /api/v1/appointments/:id/no-show`
- `GET /api/v1/leads/:leadId/journey`

## 5. Kurallar

- End > start; timezone IANA allowlist/zone parser ile doğrulanır.
- Invalid/expired state and stale version `409/422` üretir.
- Aynı lead ve organization için overlapping active appointment reddedilir.
- Appointment erişimi lead assignment + current grant ile izole edilir.
- Her state change append-only journey event ve audit reference üretir.

## 6. Kabul kriterleri

1. UTC saklama ve original IANA timezone korunur.
2. Başka organization/patient randevu ve journey göremez.
3. Stale reschedule/confirm güvenli conflict üretir.
4. Cancel/complete/no-show terminal kurala uyar.
5. Journey olayları silinmez/değiştirilmez.

## 7. Doğrulama planı

Timezone validation, overlap, proposal/confirm/reschedule/cancel/complete/no-show,
authorization isolation ve append-only journey test edilir.
