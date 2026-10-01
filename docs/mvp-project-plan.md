# Proje Adı Belirlenecek — MVP Proje Planı

- **Plan sürümü:** 2.0
- **Plan tarihi:** 1 Ekim 2026
- **Planlanan başlangıç:** 5 Ekim 2026
- **Hedef release:** 22 Ocak 2027
- **Toplam takvim:** 16 hafta
- **Kaynak belge:** `/Users/berat/Downloads/Veyora_Mobil_Uygulama_Proje_Dokumani.docx`
- **Not:** “Veyora” kesin marka adı değildir. Bu plan güncel kullanıcı kararlarıyla kaynak DOCX’in kapsam ve tarihlerini revize eder.

## 1. Yönetici özeti

MVP; uluslararası hastaların doğrulanmış sağlık kuruluşu ve doktorları keşfetmesini, tedavi talebi göndermesini, güvenli biçimde mesajlaşmasını, teklif almasını, randevu ve tedavi sürecini takip etmesini sağlayan hasta mobil uygulaması ile gerekli backend/API servislerini kapsar.

Backend modüler monolith olacaktır. Mesajlar silinmez; düzenlemeler kalıcı revision olarak saklanır. Hasta ve klinik temsilcisi yalnız güncel mesajı görür, süper admin bütün konuşma ve revision’ları her zaman görebilir. Mesaj denetimi AI kullanmadan anahtar kelime ve obfuscation-aware deterministik kurallarla yapılır.

## 2. Güncel MVP kapsamı

### Dahil

- Hasta onboarding, kimlik, oturum, rıza ve profil.
- Doğrulanmış hastane/klinik, doktor ve tedavi dizini.
- Arama, filtreleme ve favoriler.
- Tedavi talebi/lead, atama ve durum geçmişi.
- Private sağlık belgesi ve görsel erişimi.
- Mesajlaşma ve kalıcı revision geçmişi.
- Süper adminin tüm mesaj/revision erişimi ve audit izi.
- Deterministik keyword, gizlenmiş telefon/iletişim bilgisi ve dış kanal denetimi.
- Şikâyet ve destek kayıtları.
- Lead follow-up; Evet/Hayır sonuçları ve çelişki incelemesi.
- Seçilen sağlık kuruluşuna opsiyonel denetim bildirimi.
- Teklif, randevu, süreç takibi ve bildirim merkezi.
- Teknik log, ürün audit log’u, gizlilik ve hesap silme politikası.

### Mevcut MVP dışında

- Concierge dizini, hizmet sağlayıcı hesabı veya rezervasyonu.
- AI/LLM/embedding tabanlı mesaj analizi.
- WhatsApp entegrasyonu.
- Doğrudan ödeme, uçuş/otel satış motoru ve sigorta provizyonu.
- Yerleşik görüntülü görüşme.
- Referral/puan, sponsorlu reklam ve gelişmiş kampanya modülleri; ayrıca onaylanmadıkça sonraki faz.
- Hastane ve süper admin panellerinin UI geliştirmesi; gerekli backend işlemleri kapsamda.

## 3. Backend spec planı

Toplam **12 backend MVP spec’i** planlanmıştır. Ayrıntılı liste `docs/spec-roadmap.md` içindedir.

| Dönem | Yazılacak/dondurulacak spec’ler |
| --- | --- |
| 1–9 Ekim 2026 | SPEC-001, SPEC-002, SPEC-003 |
| 12–23 Ekim 2026 | SPEC-004, SPEC-005, SPEC-006 |
| 26 Ekim–6 Kasım 2026 | SPEC-007, SPEC-008 |
| 9–20 Kasım 2026 | SPEC-009, SPEC-010 |
| 23 Kasım–4 Aralık 2026 | SPEC-011 |
| 7–18 Aralık 2026 | SPEC-012 ve bütün contract review |

SPEC-001 ve SPEC-002 bu oturumlar kapsamında hazırlandı. Diğer spec’ler sırayla kullanıcı onayıyla hazırlanacaktır.

## 4. Tarihli 16 haftalık MVP takvimi

Bu tarihler planlama baseline’ıdır; ekip kapasitesi, hukuk/gizlilik kararları ve provider seçimleri onaylandığında revize edilir.

| Hafta | Tarih | Ana çalışma | Somut çıktı / kabul kapısı |
| --- | --- | --- | --- |
| 1 | 5–9 Ekim 2026 | Kapsam dondurma, SPEC-001–003, veri envanteri, stack kararı | Onaylı MVP, 12-spec roadmap, auth/role/monolith kararı |
| 2 | 12–16 Ekim 2026 | Modüler monolith temeli, config, DB/migration yaklaşımı, auth başlangıcı | Çalışan teknik temel ve environment sözleşmesi |
| 3 | 19–23 Ekim 2026 | Session, rıza, roller, hasta profili | Kimlik ve sahiplik akışı staging smoke için hazır |
| 4 | 26–30 Ekim 2026 | Kuruluş/doktor/tedavi modeli ve doğrulama | Doğrulanmış/published katalog contract’ı |
| 5 | 2–6 Kasım 2026 | Keşif, arama, filtre ve favoriler | Klinik/tedavi keşfi uçtan uca |
| 6 | 9–13 Kasım 2026 | Tedavi talebi, Lead ID, consent snapshot, assignment | Talep oluşturma ve yetkili klinik erişimi |
| 7 | 16–20 Kasım 2026 | Private dosya upload/download, validation ve scan sınırı | Yetkili belge paylaşımı; public URL yok |
| 8 | 23–27 Kasım 2026 | Mesajlaşma ve kalıcı revision | Katılımcı güncel mesajı, süper admin bütün sürümleri görür |
| 9 | 30 Kasım–4 Aralık 2026 | Deterministik denetim, flag ve admin inceleme | Düz/gizlenmiş numara rule senaryoları geçer; AI çağrısı yok |
| 10 | 7–11 Aralık 2026 | Şikâyet/destek, lead follow-up ve kuruluş bildirimi | YES/NO follow-up, case ve audit’li organization notice |
| 11 | 14–18 Aralık 2026 | Teklif yaşam döngüsü | Para/geçerlilik/dahil-hariç ve tekil kabul davranışı |
| 12 | 21–25 Aralık 2026 | Randevu ve journey state; timezone | İzinli durum geçişleri ve doğru saat gösterimi |
| 13 | 28 Aralık 2026–1 Ocak 2027 | Bildirim merkezi, outbox/retry ve preference | Mesaj/teklif/randevu/denetim teslim kayıtları |
| 14 | 4–8 Ocak 2027 | Gizlilik, retention, hesap silme, audit ve log redaction | Veri yaşam döngüsü ve hassas log kontrolleri |
| 15 | 11–15 Ocak 2027 | Entegrasyon, güvenlik, performans, backup/restore ve UAT | Release candidate; P0/P1 hata yok |
| 16 | 18–22 Ocak 2027 | Hata kapatma, operasyon paketi ve release kararı | MVP release paketi ve kabul raporu |

## 5. Kilometre taşları

| Kod | Tarih | Kilometre taşı | Kabul kapısı |
| --- | --- | --- | --- |
| K1 | 9 Ekim 2026 | Kapsam ve spec haritası | Güncel MVP ve 12 spec onaylandı |
| K2 | 23 Ekim 2026 | Platform/auth temeli | Rol, session, consent ve monolith contract’ı doğrulandı |
| K3 | 20 Kasım 2026 | Keşif ve lead alpha | Kayıt → keşif → talep → private dosya akışı çalışıyor |
| K4 | 11 Aralık 2026 | İletişim ve denetim beta | Message revision, rule screening, case, follow-up ve audit çalışıyor |
| K5 | 8 Ocak 2027 | İş akışları tamam | Teklif, randevu, journey ve notification entegre |
| K6 | 15 Ocak 2027 | Release candidate | Güvenlik/regresyon/UAT kapıları geçti |
| K7 | 22 Ocak 2027 | MVP release | Operasyon ve teslimat paketi onaylandı |

## 6. Kabul ölçütleri

1. Doğrulanmamış kuruluş “doğrulanmış” görünmez ve kabul edilmiş policy’ye göre talep alamaz.
2. Hasta yalnız kendi lead, konuşma, dosya, teklif ve randevularına erişir.
3. Klinik temsilcisi yalnız kuruluşuna atanmış ve hastanın paylaşım izni verdiği kayıtlara erişir.
4. Mesaj düzenlenince katılımcılar eski içeriği göremez; süper admin tüm revision’ları görür.
5. Düz, ayırıcılarla gizlenmiş, Unicode rakamlı ve desteklenen sözlükte yazıyla/hecelenmiş numaralar deterministik rule ile flag üretir.
6. Mevcut MVP denetiminde AI/provider çağrısı yapılmaz.
7. Şikâyet/destek, follow-up ve kuruluş bildirimi bütün kritik geçişleri audit eder.
8. `sendNotice = NO` dış bildirim oluşturmaz; `YES` seçilen kuruluşa tekil ve izlenebilir teslim oluşturur.
9. Sağlık verisi, mesaj/revision içeriği, belge, OTP ve token teknik loglara yazılmaz.
10. Concierge endpoint/modülü MVP release’ine dahil edilmez.
11. P0/P1 açık hata varken release kararı verilmez.
12. Backup restore ve kritik auth/ownership/IDOR kontrolleri release öncesi gerçek senaryoyla doğrulanır.

## 7. Teslimatlar

- Altı canonical backend context belgesi.
- 12 backend spec’i.
- API contract/OpenAPI paketi — implementation aşamasında.
- DB migration ve veri sözlüğü — implementation aşamasında.
- Güvenlik, audit, log/redaction ve retention kararı.
- Test/UAT raporu.
- Operasyon, backup/restore ve release notu.
- Mobil uygulama ve backend release paketleri — ayrı implementation teslimatları.

## 8. Riskler ve bağımlılıklar

| Risk / bağımlılık | Etki | Karar / azaltma |
| --- | --- | --- |
| Framework/DB/ORM kesin değil | Foundation spec bloke olabilir | SPEC-002’de 9 Ekim’e kadar karar |
| Auth/session/2FA kesin değil | Rol ve erişim contract’ları gecikir | SPEC-003’te dondur |
| Denetim dil sözlüğü kesin değil | Gizlenmiş numara kapsamı belirsiz | İlk dil setini SPEC-001 açığı olarak kapat |
| Revision/audit retention kesin değil | Veri büyümesi ve hukuki risk | SPEC-012 öncesi hukuk kararı |
| Kuruluş bildirim kanalı kesin değil | Teslim davranışı belirsiz | SPEC-011’de kanal ve retry seç |
| Sağlık verisi hukuki onayı yok | Release riski | KVKK/GDPR danışman incelemesi |
| Hastane/admin UI ayrı kapsam | Uçtan uca operasyon görünmeyebilir | Contract-first test client ve UAT fixture |
| Aralık tatil/izin kapasitesi | 16 haftalık tarih kayabilir | Kapasite onayında baseline revizyonu |

## 9. Açık kararlar

1. Node 22 LTS + pnpm 10 + NestJS 11/Fastify 5 + PostgreSQL + Prisma 6 stack’i kabul edildi; patch/build image ve deployment ayrıntıları nedir?
2. Firebase Authentication Google/Apple/email-password + token validation ve kısa süreli cache olarak kabul edildi; 2FA sonraki fazdır.
3. Mesaj düzenleme süresi ve revision/audit retention nedir?
4. İlk screening sözlüğü hangi dilleri kapsar?
5. Lead follow-up hareketsizlik eşiği ve hedef tarafları nedir?
6. Denetim bildirimi hangi kanaldan kuruluşa gider?
7. İlk dil ve para birimi seti nedir?
8. Uygulama release’i Türkiye pilotuyla mı sınırlıdır?

## 10. Değişiklik yönetimi

Bu planın tarih, kapsam veya spec sayısını değiştiren her karar `docs/progress-tracker.md`, `docs/spec-roadmap.md`, ilgili feature spec ve Obsidian `Proje Özeti.md` dosyasına aynı görev içinde işlenir. Concierge veya AI yeniden kapsama alınırsa yeni spec olarak eklenir; mevcut 12 spec’e sessizce sıkıştırılmaz.
