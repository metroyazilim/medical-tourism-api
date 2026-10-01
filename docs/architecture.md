# Backend Architecture Context

Bu belge planlanan backend’in teknik haritasıdır. Henüz repository, schema, migration veya çalışan servis yoktur. Durum terimleri `project-overview.md` içindeki sözlüğe göre kullanılır.

## Stack tablosu

| Katman | Teknoloji / yaklaşım | Sorumluluk | Durum | Gerekçe / dayanak |
| --- | --- | --- | --- | --- |
| Runtime ve dil | Node 22 LTS + TypeScript | API, gerçek zamanlı mesajlaşma ve iş kuralları | **Accepted** | Kullanıcının SPEC-002 karar cevabı |
| Backend framework | NestJS 11 + Fastify 5 | Modüler HTTP/WebSocket uygulaması | **Accepted** | Kullanıcının SPEC-002 karar cevabı |
| Alternatif framework | Hono | Daha hafif HTTP/RPC uygulaması | **Rejected for MVP foundation** | NestJS/Fastify seçildi |
| Mimari biçim | Modüler monolith | MVP modüllerini tek deploy edilebilir backend’de tutmak | **Accepted** | Kullanıcı “monolith iyidir” dedi |
| Veritabanı | PostgreSQL | İlişkisel ürün, sahiplik, durum ve audit verileri | **Accepted** | Kullanıcının SPEC-002 karar cevabı |
| ORM / veri erişimi | Prisma | Şema, migration ve tipli veri erişimi | **Accepted** | Kullanıcının SPEC-002 karar cevabı; sürüm/locking ayrıntısı açık |
| Authentication | Firebase Authentication; Google, Apple ve email/password; Firebase token validation + kısa süreli cache | Kimlik doğrulama ve oturum | **Accepted baseline / Proposed ayrıntı** | 2FA sonraki faz; cache/revoke ayrıntısı implementation’da |
| Yetkilendirme | Rol + kuruluş üyeliği + kayıt sahipliği + paylaşım izni | Her kaynak için erişim kararı | **Accepted gereksinim / Proposed model** | Ayrıntılı izin matrisi SPEC-003’te |
| Input validation | Zod tabanlı şema validation; boundary validation | İstek, event ve entegrasyon girdilerini doğrulamak | **Accepted yaklaşım / Proposed sürüm** | RFC 9457 standard catalog ve field error mapping ile birlikte |
| Dosya depolama | Cloudflare R2 veya S3 uyumlu object storage | Sağlık belgesi, fotoğraf ve ekleri DB dışında saklamak | **Proposed** | SPEC-008’de kapanacak |
| Cache | Redis | Job/cache ve gerektiğinde rate limit/cache | **Accepted foundation seçimi** | Key, eviction ve failure davranışı açık |
| Queue / background job | BullMQ + Redis; `<domain>.<operation>` queue; jobId/idempotency; exponential backoff + bounded attempts + dead-letter | Lead follow-up, kuruluş bildirimi ve retry | **Accepted production baseline** | Domain state transition/failure ayrıntısı ilgili spec’lerde |
| Gerçek zamanlı iletişim | WebSocket; reconnect + cursor replay + ack | Mesaj ve durum olaylarını istemcilere iletmek | **Accepted foundation / feature contract Proposed** | Event schema ve conversation authorization SPEC-001’de |
| AI entegrasyonu | Yok | Mevcut MVP’de AI/model çağrısı yapılmaz | **Rejected (mevcut MVP)** | Güncel kullanıcı kararı |
| Push bildirim | Firebase/APNs | Mobil bildirim | **Proposed** | SPEC-011’de kapanacak |
| Uygulama logları | Pino JSON → self-hosted collector → Loki/Grafana | Request/error/performans logları | **Accepted production baseline** | 30 gün operational retention; PII redaction |
| Log toplama/görüntüleme | Loki + Grafana retained logs | Merkezi arama, grafik ve retention | **Accepted baseline / Proposed deployment ayrıntısı** | Alert, collector ve OTLP export ayrıntısı implementation’da |
| Audit log | PostgreSQL’de append-oriented audit kayıtları | Hassas erişim ve önemli iş değişikliklerinin izi | **Accepted** | Kullanıcının SPEC-002 karar cevabı |
| Hata takibi | Self-hosted/ücretsiz seçenek veya merkezi log | Exception/crash görünürlüğü | **Unknown** | Sentry/Crashlytics kararı alınmadı |
| Mobil log alımı | Kontrollü mobile-log ingest API → merkezi log | Mobil JS/API hatalarını toplamak | **Proposed** | Veri minimizasyonu ve kötüye kullanım koruması spec gerektirir |
| Test yaklaşımı | GitHub Actions lint/typecheck/unit/integration/API/security/smoke/UAT gates | İş kuralları ve veri bütünlüğünü doğrulamak | **Accepted production baseline / Proposed framework** | Framework ve kesin komutlar implementation’da |
| Deployment | Docker + Dokploy | Tek/modüler backend deployment | **Accepted** | Ayrı migration release, OpenBao runtime references ve expand/contract rollback |

### Maliyet ve operasyon kararı

- **Accepted:** Teknik loglama için ücretli SaaS zorunlu değil; Pino JSON → self-hosted collector → Loki/Grafana, 30 gün operational retention ve PII redaction seçildi.
- **Accepted:** Günlük full backup + sürekli WAL/PITR, aylık staging restore + production-safe sample, RPO 15 dakika / RTO 1 saat; artifact run ID/timestamps/measured RPO-RTO/readiness/remediation taşır.
- **Accepted:** GitHub Actions lint/typecheck/unit/integration/API/security/smoke/UAT gates baseline.
- **Accepted:** OpenBao + Dokploy runtime references; secret values loglanmaz, missing/invalid secret fail-fast olur.

## Sistem sınırları

Aşağıdaki sınırlar klasör adı değil, iş sorumluluğu sınırıdır. Framework ve fiziksel klasörler seçildikten sonra aynı isimlerle uygulanmak zorunda değildir.

| Sınır | Sorumluluk | Durum |
| --- | --- | --- |
| Identity & Access | Kimlik doğrulama, oturum, roller, kuruluş üyeliği, kaynak sahipliği | **Accepted ihtiyaç; Proposed modül** |
| Patient | Hasta minimum profile, preferences ve rıza referansları | **Accepted ihtiyaç; Proposed modül** |
| Provider Directory | Organization + locations, doctor, curated treatment, verification ve publication | **Accepted ihtiyaç; SPEC-005 hazır** |
| Discovery | Public organization/doctor/treatment search, allowlisted filters, cursor pagination ve private patient favorites | **Accepted; SPEC-006 hazır** |
| Concierge Directory | Yardımcı hizmet sağlayıcı, hizmet bölgesi ve hizmet teklifleri | **Deprecated / mevcut MVP dışında** |
| Inquiry / Lead | Tedavi talebi, klinik ataması, paylaşım izinleri ve lead durumu | **Proposed** |
| Messaging | Konuşma, mesaj, attachment bağlantısı ve kalıcı message revision | **Accepted ihtiyaç; Proposed modül** |
| Quote | Klinik teklifi, para birimi, kalemler, geçerlilik ve kabul/red | **Proposed** |
| Appointment & Journey | Randevu, durum zaman çizelgesi ve süreç olayları | **Proposed** |
| Lead Follow-up | Hareketsizlik, Evet/Hayır sonuç sorgusu ve çelişki inceleme | **Accepted** |
| Message Screening | Anahtar kelime, normalize edilmiş/gizlenmiş numara ve kaçınma biçimlerini deterministik kurallarla işaretleme | **Accepted** |
| Complaints & Support | Mesaj/conversation/lead bağlı şikâyet ve destek kayıtları | **Accepted** |
| Files | Metadata, object storage anahtarı, tarama/durum ve yetkili erişim | **Proposed** |
| Notifications | Süper adminin seçtiği kuruluşa opsiyonel denetim bildirimi; diğer kanallar | **Accepted ihtiyaç; kanal teknolojisi Unknown** |
| Admin & Verification | Tüm konuşma/revision erişimi, denetim, kuruluş doğrulama ve kısıtlama | **Accepted rol; Proposed modül** |
| Audit & Operations | Admin erişimi, revision, şikâyet/destek, denetim kararı ve bildirim audit’i | **Accepted ihtiyaç; Proposed modül** |
| Reviews / Referral / Commission | Yorum, yönlendirme ve komisyon takibi | **Proposed; MVP durumu Unknown** |

**Accepted mimari kural:** İlk aşama tek modüler monolith ve tek ilişkisel veritabanıdır. Mikroservis, event bus veya ayrı servis yalnızca ölçülen ölçek/izolasyon ihtiyacı ve yeni kullanıcı kararıyla eklenir.

## Veri modeli

Bu bölüm kavramsaldır; fiziksel tablo, enum veya migration tanımlamaz.

### Kimlik ve kuruluş

| Varlık | Amaç ve temel ilişkiler | Sahiplik / önemli durum |
| --- | --- | --- |
| `UserIdentity` | Firebase UID/provider identity bağlantısı | Google/Apple/email-password; provider identity canonical bağlantıdır |
| `UserProfile` + `PatientPreference` | Minimum patient profile, locale/currency ve contact preferences | Identity’den ayrı; private-by-default; soft-delete/anonymization durumu |
| `DeviceSession` | Cihaz oturumu ve revoke durumu | Raw token/credential tutulmaz; active/revoked/expired |
| `Organization` | Hastane/klinik tüzel ve erişim sınırı | Membership ve public profile kapsamı ayrıdır |
| `OrganizationMembership` | Kullanıcı–kuruluş rol ve durum ilişkisi | Invite + pending/active/suspended/revoked |
| `AdminRole` / policy | Super admin ve organization admin capability’leri | Doctor profile bağımsız actor değildir |

### Dizin ve doğrulama

| Varlık | Amaç ve temel ilişkiler | Sahiplik / önemli durum |
| --- | --- | --- |
| `Organization` + `OrganizationLocation` | Sağlık kuruluşu aggregate’i ve location’ları | Draft/submitted/in_review/verified/published/rejected/suspended/expired state’leri **Accepted** |
| `DoctorProfile` + `DoctorOrganizationLink` | Organization-managed multi-organization doktor profili | Bağımsız giriş hesabı/session yok; link state/public projection ayrı |
| `Treatment` / `TreatmentCategory` | Super admin curated treatment kataloğu | Stable code/slug, locale display, published/deprecated/archived state **Accepted** |
| `VerificationRecord` | Evidence, expiry, re-verification ve admin karar izi | Evidence private; decision/reason/timestamps audit edilir **Accepted** |
| `ServiceProvider` / `ServiceOffer` | Önceki concierge kapsamı | **Deprecated; mevcut MVP şemasına girmez** |

### Talep, iletişim ve süreç

| Varlık | Amaç ve temel ilişkiler | Sahiplik / önemli durum |
| --- | --- | --- |
| `Inquiry` / `Lead` | Patient-owned intake ve organization-specific fırsat | Bir Inquiry altında en fazla 3 izole organization Lead’i **Accepted; SPEC-007** |
| `LeadAssignment` | Organization accept/decline ve erişim bağlantısı | Patient seçer; super admin gerekçeyle revoke/reassign eder **Accepted** |
| `LeadAccessGrant` | Organization-specific field/attachment paylaşım kapsamı | Güncel general consent + active grant her read’de; snapshot yok **Accepted** |
| `GeneralConsentRecord` | Tek genel rıza sürümü, locale, actor ve zaman kanıtı | Recipient-specific snapshot MVP’de yok |
| `Conversation` | Talep veya destek bağlamındaki tarafları birleştirir | Katılımcılar kendi konuşmalarını; süper admin bütün konuşmaları her zaman görebilir **Accepted** |
| `Message` | Gönderici, konuşma, güncel içerik ve zaman | İz bırakmadan silmeme **Accepted** |
| `MessageRevision` | Her düzenlemenin eski/yeni içeriği, aktörü ve zamanı | Kalıcıdır; yalnız süper admin içerik geçmişini görür, katılımcılar yalnız güncel mesajı görür **Accepted** |
| `Attachment` / `Document` | Object storage metadata ve erişim bağlamı | Hasta/kuruluş sahipliği; tarama ve retention **Unknown** |
| `Quote` / `QuoteItem` | Tutar, para birimi, dahil/hariç kapsam, geçerlilik | Taslak/gönderildi/kabul/red/süresi doldu durumları **Proposed** |
| `Appointment` | Zaman, saat dilimi, taraflar ve durum | Reschedule/cancel politikası **Unknown** |
| `InquiryTimelineEvent` / `LeadTimelineEvent` | Actor/from/to/reason/time/request/version içeren append-only geçmiş | Optimistic version; stale transition `409` **Accepted** |
| `LeadOutcome` | Hasta ve/veya klinikten Evet/Hayır sonuç beyanı | Çelişkili cevaplar admin incelemesine düşer **Accepted davranış** |
| `FollowUpTask` | Hareketsizlik/sonuç sorgusu işi | 7 gün meaningful inactivity; iki tarafa YES/NO; delivery SPEC-011 **Accepted** |

### Denetim ve operasyon

| Varlık | Amaç ve temel ilişkiler | Sahiplik / önemli durum |
| --- | --- | --- |
| `ScreeningRule` | Anahtar kelime, normalizasyon ve pattern sürümü | Aktif/pasif ve sürümlü; AI/model içermez **Accepted** |
| `RiskFlag` | Kural eşleşmesini mesaj/conversation/kuruluşla ilişkilendirir | Açık, inceleniyor, doğrulandı, yanlış pozitif, kapandı **Accepted ihtiyaç** |
| `Complaint` / `SupportCase` | Katılımcı bildirimi ve admin çözüm akışı | Konuşma/mesaj/lead bağlantısı ve durum geçmişi **Accepted** |
| `AuditEvent` | Aktör, eylem, hedef, zaman, request ID ve güvenli revision/inceleme referansı | Append-oriented; retention **Unknown** |
| `OrganizationNotice` / `DeliveryAttempt` | Süper adminin seçilen kuruluşa göndermeyi onayladığı denetim bildirimi | Evet/Hayır gönderim kararı ve teslim sonucu audit edilir **Accepted** |
| `Review` | Tedavi sonrası puan/yorum | MVP durumu **Unknown** |
| `Referral` / `Commission` | Lead kaynağı ve ticari sonuç | İş modeli, oran ve finansal doğruluk kuralları **Unknown** |
| `ServiceBooking` / `Package` | Önceki concierge kapsamı | **Deprecated; mevcut MVP şemasına girmez** |

### Saklama ve silme açıkları

- Sağlık verisi, belge, mesaj, revision, audit log ve teknik log için retention süreleri **Unknown**.
- Hesap silme talebinin hangi verileri anonimleştireceği, hangilerinin yasal/audit gerekçesiyle tutulacağı **Unknown**.
- Veri yerleşimi, yedekleme, geri yükleme, felaket kurtarma ve şifreleme anahtar yönetimi **Unknown**.
- Mesaj ve revision kayıtları ürün davranışı gereği silinmez; yasal saklama/silme çatışmasının çözümü **Unknown**.

## Auth ve yetkilendirme

### Kimlik doğrulama

- **Accepted:** Firebase Authentication ile Google, Apple ve email/password.
- **Accepted:** Backend Firebase token validation yapar; validation sonucu en fazla 15 dakika kısa süreli cache’lenebilir. Cache auth policy yerine geçmez.
- **Accepted:** Device session tutulur; kullanıcı aktif cihazını/oturumunu sonlandırabilir.
- **Accepted:** Public discovery login olmadan yapılır; inquiry, dosya, mesaj, teklif ve randevu işlemleri authentication ister.
- **Accepted:** Tek genel rıza kaydı; consent version, locale, actor ve timestamp tutulur. Recipient-specific snapshot MVP’de yoktur.
- **Accepted:** 2FA ve telefon OTP MVP dışındadır.
- **Accepted:** Soft delete + anonymization request ve baseline abuse controls uygulanır.

### Yetkilendirme

Kimliği doğrulanmış olmak, bir kaynağa erişim hakkı vermez. Her işlem şu kontrolleri ayrı ayrı yapmalıdır:

1. Kullanıcı aktif mi ve gerekli capability’ye sahip mi?
2. Kullanıcı ilgili kuruluşun `active` üyesi mi?
3. Kaynak o kullanıcıya/kuruluşa mı ait veya açıkça atanmış mı?
4. Hasta genel rıza durumunu koruyor mu ve kaynak paylaşım policy’si erişimi açıyor mu?
5. Kaynağın mevcut durumu işlemi izinli kılıyor mu?
6. Süper admin erişimi mi? Süper admin bütün konuşma ve revision’ları her zaman görebilir; erişim yine de audit edilmelidir.
7. İşlem audit gerektiriyor mu?

### Bilinen rol kuralları

- **Accepted:** Patient yalnızca kendi profile, inquiry/lead, conversation, attachment, quote ve appointment kayıtlarını görür.
- **Accepted:** Organization member/admin yalnızca invite ile gelen ve `active` olan membership + assignment/share policy’nin açtığı kaynakları görür.
- **Accepted:** Doctor profile organization-managed’dır; bağımsız authenticated actor değildir.
- **Accepted:** Süper admin en yetkili roldür ve bütün konuşmaların güncel mesajlarıyla tüm revision geçmişini her zaman okuyabilir.
- **Accepted:** Süper adminin mesaj/revision erişimi ile inceleme, şikâyet/destek kararı ve kuruluş bildirimi audit edilir.
- **Accepted:** Konuşma katılımcıları yalnız kendi konuşmalarındaki güncel mesaj içeriğini ve düzenlendi göstergesini görür; eski revision içeriğini göremez.

## Entegrasyonlar ve operasyon

### Dış servisler

| İhtiyaç | Durum | Not |
| --- | --- | --- |
| Object storage | **Proposed** | Cloudflare R2/S3 uyumlu seçenek; private-by-default ve süreli erişim URL’si adayı |
| Email/password/provider auth | **Accepted** | Firebase Authentication; phone OTP MVP’de yok |
| Push | **Proposed** | Firebase/APNs; mobil stack ve hesaplar kesin değil |
| AI mesaj analizi | **Rejected (mevcut MVP)** | Harici model/provider kullanılmayacak; denetim deterministik kural motorudur |
| Teknik log | **Proposed** | Pino → self-hosted Loki → Grafana |
| Mobil crash/error | **Proposed** | Reactotron geliştirme, mobile-log API, Firebase Crashlytics; veri politikası onaylanmalı |
| Ödeme | **Unknown / Proposed sonraya** | Kullanıcı tarafından kesin reddedilmedi; MVP assistant önerisinde yok |
| WhatsApp | **Rejected şimdilik** | Platform dışı görüşme sonuç takibi ayrı ihtiyaç |

### Dosya erişimi

- Dosyalar public URL ile yayımlanmamalı; yetkili istek sonrası kısa ömürlü indirme/yükleme yetkisi **Proposed**.
- Metadata DB’de, binary object storage’da tutulur **Proposed**.
- Upload boyutu, MIME allowlist, malware scan, EXIF temizleme, karantina ve thumbnail davranışı **Unknown**.
- Teknik loglara belge, mesaj veya revision içeriği konulmamalı **Accepted gereksinim**.

### Asenkron işler

Lead follow-up ve kuruluş bildirimi request lifecycle dışında güvenilir iş gerektirebilir. Foundation’da BullMQ + Redis zorunlu job backend, domain queue naming, jobId/idempotency, exponential backoff, bounded attempts ve dead-letter **Accepted production baseline**’dır. Worker, retry state transition ve domain failure ayrıntıları ilgili feature spec’lerinde seçilecektir. Mevcut MVP’de AI batch işi yoktur.

### Deployment ve gözlemlenebilirlik

- **Accepted:** Docker + Dokploy ile tek modüler backend; OpenBao runtime references; missing/invalid secret fail-fast; yatay çoğaltma ancak ölçülmüş ihtiyaçla.
- **Accepted:** Pino JSON → self-hosted collector → Loki/Grafana; 30 gün operational log retention; PII redaction; PostgreSQL audit.
- **Accepted baseline:** OpenTelemetry OTLP trace export adayı; GitHub Actions lint/typecheck/unit/integration/API/security/smoke/UAT gates.
- **Accepted baseline:** Günlük şifreli full backup + sürekli WAL/PITR + aylık staging restore/production-safe sample; hedef RPO 15 dakika / RTO 1 saat. Artifact run ID, timestamps, measured RPO/RTO, readiness kanıtı ve remediation taşır.

## Değişmez kurallar

Aşağıdakiler mevcut kodun durumu değil, gelecekte uygulanması gereken backend kurallarıdır.

1. Her korumalı kaynak erişimi kimlik doğrulama dışında rol, kuruluş, sahiplik/atama ve paylaşım iznini de doğrulamalıdır.
2. Hasta sağlık verisi ve belgeleri varsayılan olarak private olmalı; açık yetki olmadan başka hasta, kuruluş veya hizmet sağlayıcıya açılamamalıdır.
3. Parola, OTP, access/refresh token, sağlık açıklaması, mesaj içeriği, belge içeriği ve kimlik verisi teknik loglara yazılmamalıdır.
4. Mesajlar iz bırakmadan silinmemeli; her düzenleme kalıcı revision üretmelidir. Katılımcılar yalnız güncel içeriği, süper admin eski/yeni bütün revision’ları görmelidir.
5. Teklif kabulü, durum geçişleri ve benzeri kritik mutasyonlar atomik, yetkili ve tekrarlı isteğe dayanıklı olmalıdır.
6. Süper adminin mesaj/revision erişimi, şikâyet/destek işlemleri, denetim kararları ve kuruluş bildirimleri aktör, hedef, zaman ve request ID ile audit edilmelidir.
7. Teknik log ile ürün audit log’u aynı şey değildir; audit kayıtları operasyon log retention’ına bağlı kaybolmamalıdır.
8. Object storage nesneleri public-by-default olamaz; erişim uygulama yetkilendirmesinden geçmelidir.
9. Mevcut MVP mesaj denetiminde AI/model çağrısı yapılamaz; yalnız sürümlü deterministik normalizasyon ve kurallar kullanılmalıdır.
10. Harici servis callback/webhook’ları imza, tekrar oynatma ve idempotency kontrollerinden geçmelidir.
11. Tarihler UTC olarak saklanmalı; randevularda kaynak saat dilimi ayrıca korunmalıdır (**Proposed temsil standardı**).
12. Para tutarı kullanılırsa floating-point ile saklanmamalı; minor unit veya kesin decimal ve ISO 4217 para birimiyle temsil edilmelidir (**Proposed temsil standardı**).
13. İlk spec kullanıcı tarafından yazılmadan hiçbir özellik için endpoint/schema koduna başlanmamalıdır.
