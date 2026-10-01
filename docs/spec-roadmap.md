# Backend MVP Spec Roadmap

- **Toplam planlanan backend MVP spec sayısı:** 12
- **Plan başlangıcı:** 1 Ekim 2026
- **Hedef MVP release adayı:** 22 Ocak 2027
- **Mimari:** Modüler monolith — Accepted
- **Framework/DB/ORM:** Node 22 LTS + TypeScript + NestJS 11/Fastify 5 + PostgreSQL + Prisma 6 — Accepted

Spec numarası oluşturulma sırasını gösterir; implementation sırası bağımlılıklara göre değişebilir.

## Spec listesi

| ID | Spec | Durum | Ana çıktı | Bağımlılık |
| --- | --- | --- | --- | --- |
| SPEC-001 | Mesaj Yönetişimi, Deterministik Denetim ve Lead Follow-up | **Hazır** | Mesaj/revision, süper admin erişimi, rule screening, flag, şikâyet/destek, follow-up, kuruluş bildirimi | SPEC-002, 003, 007 |
| SPEC-002 | Platform Foundation ve Modüler Monolith | **Hazır** | Runtime/framework karar kapısı, modül sınırları, config, error/request ID, DB/migration, lifecycle ve gözlemlenebilirlik sözleşmesi | — |
| SPEC-003 | Kimlik, Oturum, Rıza ve Roller | **Hazır** | Firebase auth, device session, general consent, organization membership, roles/capabilities, account deletion | SPEC-002 |
| SPEC-004 | Hasta Profili ve Tercihler | **Hazır** | Minimum patient profile, ISO/BCP 47/ISO 4217 preferences, category/channel contact prefs, private explicit share, progressive completion, field-level anonymization | SPEC-003 |
| SPEC-005 | Kuruluş, Doktor, Tedavi ve Doğrulama Dizini | **Hazır** | Organization + locations, doctor multi-org profile, curated treatment catalog, verification/publication, public-safe listing | SPEC-002, 003 |
| SPEC-006 | Keşif, Arama, Filtre ve Favoriler | **Hazır** | Organization/doctor/treatment discovery, PostgreSQL-first search, allowlisted filters, locale normalization, cursor pagination, private favorites | SPEC-004, 005 |
| SPEC-007 | Tedavi Talebi, Lead Atama ve Durum Geçmişi | **Hazır** | Structured intake, max 3 organization Lead’i, explicit grant, assignment, append-only history, 7-day follow-up | SPEC-003, 004, 005, 006 |
| SPEC-008 | Özel Dosya Depolama ve Yetkili Erişim | **Hazır + slice uygulandı** | Private upload/download, metadata, MIME/size/scan, signed-access seam | SPEC-002, 003, 007 |
| SPEC-009 | Teklif Yaşam Döngüsü | **Hazır + slice uygulandı** | Quote draft/publish/expire/accept/reject, minor-unit money ve concurrency | SPEC-007 |
| SPEC-010 | Randevu ve Tedavi Yolculuğu | **Hazır + slice uygulandı** | Timezone-aware appointment, reschedule/cancel, journey timeline | SPEC-007, 009 |
| SPEC-011 | Bildirim Merkezi ve Teslim | **Hazır + slice uygulandı** | In-app events, preferences, deduplication, bounded retry/outbox seam | SPEC-002, 003 |
| SPEC-012 | Gizlilik, Hesap Silme, Audit ve Operasyonel Hazırlık | **Hazır + slice uygulandı** | Retention/anonymization, audit erişimi, log/redaction, ops/release gate | Tüm ilgili spec’ler |

## Kapsam kararları

### MVP’de

- Hasta, klinik/hastane temsilcisi ve süper admin backend yüzeyleri.
- Keşif, talep/lead, dosya, mesaj, teklif, randevu ve süreç takibi.
- Mesaj revision geçmişi; eski içerik yalnız süper admin.
- Deterministik keyword/gizlenmiş iletişim bilgisi denetimi.
- Lead follow-up, şikâyet/destek ve kuruluş denetim bildirimi.
- Audit, gizlilik ve operasyonel loglama.

### MVP’de değil

- Concierge dizini/sağlayıcı/rezervasyon.
- AI/LLM/embedding tabanlı mesaj analizi.
- WhatsApp entegrasyonu.
- Ödeme, uçuş/otel satış motoru, video görüşme.
- Referral/puan, sponsorlu reklam ve gelişmiş kampanya backend’i; ayrıca karar verilmedikçe sonraki faz.

## Yazım ve uygulama sırası

1. SPEC-002 ve SPEC-003 bağımlılıkları dondurur.
2. SPEC-004–008 hasta, katalog, lead ve dosya omurgasını kurar.
3. Hazır olan SPEC-001, bu bağımlılıklar uygulandıktan sonra implement edilir.
4. SPEC-009–011 ticari/süreç/bildirim akışlarını tamamlar.
5. SPEC-012 release öncesi veri yaşam döngüsü ve operasyon kapısını kapatır.

## Spec tamamlama ölçütü

Her spec şu bölümler olmadan hazır sayılmaz:

- Amaç ve kapsam dışı.
- Aktör/yetki matrisi.
- Veri sahipliği ve kavramsal model.
- API işlem grupları.
- Validation, hata, conflict, idempotency ve transaction kuralları.
- Audit/log/redaction gereksinimleri.
- Ölçülebilir kabul kriterleri.
- Bağımlılıklar ve açık sorular.
- Gerçek davranış doğrulama planı.
