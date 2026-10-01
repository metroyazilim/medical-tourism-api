# SPEC-003 — Kimlik, Oturum, Rıza ve Roller

- **Durum:** Accepted — grouped decision gate tamamlandı; implementation başlamadı
- **Tarih:** 1 Ekim 2026
- **Tür:** Identity, session, consent and authorization specification
- **Bağımlılık:** SPEC-002 Platform Foundation ve Modüler Monolith
- **Uygulama durumu:** Başlanmadı
- **Provider baseline:** Firebase Authentication
- **MVP auth yöntemleri:** Google, Apple ve email/password
- **Session baseline:** Firebase refresh + backend Firebase token validation cache; validation cache TTL en fazla 15 dakika
- **MVP kapsam dışı:** 2FA; sonraki faz

## 1. Amaç

Bu spec; hasta, kuruluş üyesi/yöneticisi, doktor profili ve süper admin aktörlerinin kimlik doğrulama, cihaz oturumu, genel rıza, kuruluş üyeliği ve kaynak erişim sınırlarını tanımlar.

Amaç; kimlik doğrulamayı kaynak yetkilendirmesinden ayırmak, Firebase provider sınırını backend policy katmanından izole etmek ve sağlık verisi/lead paylaşımında erişim kararını denetlenebilir hale getirmektir.

## 2. Kapsam

### 2.1 Kapsam içinde

- Google, Apple ve email/password ile Firebase Authentication.
- Backend’in Firebase token doğrulaması ve en fazla 15 dakikalık validation cache.
- Kullanıcı profilinin identity kaydından ayrılması.
- Cihaz oturumlarının kaydı, listelenmesi ve sonlandırılması.
- Public discovery ve inquiry aşamasında authentication zorunluluğu.
- Tek genel rıza kaydı: metin/sürüm, locale, actor ve zaman damgası.
- Hasta, organization member, organization admin, doctor profile ve super admin sınırları.
- Invite tabanlı organization membership.
- Membership, assignment, ownership ve share check’lerinin birlikte uygulanması.
- Soft delete ve anonymization request.
- Email verification, rate limit, brute-force, reset replay ve auth audit kontrolleri.

### 2.2 Kapsam dışında

- 2FA/MFA; sonraki faz.
- Telefon OTP.
- Bağımsız doktor login hesabı.
- OAuth provider implementation kodu veya Firebase project kurulumu.
- Feature-specific lead assignment state machine; SPEC-007.
- Kuruluş/doktor doğrulama ve yayın workflow’u; SPEC-005.
- Retention sürelerinin hukuki nihai kararı ve operasyonel restore; SPEC-012.

## 3. Kabul edilmiş kararlar

| Karar | Accepted seçim | Sınır / not |
| --- | --- | --- |
| Auth provider | Firebase Authentication | Backend provider adapter üzerinden doğrular; domain Firebase SDK’ya bağlanmaz |
| Auth yöntemleri | Google + Apple + email/password | Telefon OTP MVP’de yok |
| Token/session | Firebase refresh + backend validation cache | Cache TTL en fazla 15 dakika; cache auth policy yerine geçmez |
| Device sessions | Cihaz oturumu tutulur | Kullanıcı aktif cihazları görebilir ve sonlandırabilir |
| Discovery | Public discovery | Inquiry, dosya, mesaj, teklif ve randevu için auth gerekir |
| Consent | Tek genel rıza | Purpose-specific ve recipient-specific consent snapshot bu spec’te yok |
| Roller | Patient, organization member/admin, doctor profile, super admin | Doktor profili bağımsız authenticated actor değildir |
| Organization access | Invite + active membership + assignment/share checks | Client’tan gelen organization ID güvenilir kabul edilmez |
| Account deletion | Soft delete + anonymization request | Legal/audit tutulması gereken kayıtlar ayrı policy’ye tabidir |
| Abuse controls | Email verification, rate limit, brute-force protection, expiry/replay protection ve audit | Sayısal eşikler implementation/config kaydında sabitlenir |
| 2FA | Sonraki faz | MVP auth gate’i değildir |

## 4. Aktör ve yetki matrisi

| Aktör | Identity | Organization | Kaynak erişimi | Kritik sınır |
| --- | --- | --- | --- | --- |
| Patient | Kendi Firebase identity/profile’ı | Organization membership taşımaz | Kendi inquiry/lead, conversation, attachment, quote ve appointment kayıtları | Başka hastanın kaydını veya kuruluş içi kaynağı göremez |
| Organization member | Firebase identity + aktif membership | Davet ile katılır | Membership ve assignment/share policy’nin açtığı kuruluş lead/conversation/file kayıtları | Organization ID client input’undan çözülmez |
| Organization admin | Organization member’ın yönetim capability’leri | Davet/onay ve üyelik yönetimi | Kuruluş kapsamındaki yetkili kayıtlar ve üyelik işlemleri | Başka kuruluş veya süper admin işlemi yok |
| Doctor profile | Organization altında profil | Aktif organization’a bağlıdır | Doktorun bağlı olduğu kuruluşun policy ile açtığı kaynaklar | Bağımsız login/session yok |
| Super admin | Global Firebase identity | Organization scope’a bağlı değildir | Tüm conversation ve MessageRevision içerikleri, admin inceleme ve audit yüzeyleri | Her erişim ve admin aksiyonu audit edilir |

### 4.1 Capability ilkeleri

Role adı tek başına erişim kararı değildir. Korumalı her use-case şu sıralı kontrolleri yapar:

1. Firebase token geçerli mi ve identity aktif mi?
2. Kullanıcı ilgili capability’ye sahip mi?
3. Kuruluş işlemi ise aktif membership var mı?
4. Kaynak kullanıcıya ait mi, kuruluşa atanmış mı veya açıkça paylaşılmış mı?
5. Genel rıza ve kaynak paylaşım durumu erişimi destekliyor mu?
6. Aggregate mevcut state’i işlemi izinli kılıyor mu?
7. İşlem audit gerektiriyor mu?

Süper admin bütün konuşma ve message revision kayıtlarına her zaman erişebilir; bu istisna merkezi policy ile uygulanır ve audit edilir.

## 5. Authentication sözleşmesi

### 5.1 Provider boundary

- Mobil/web client Firebase Authentication SDK ile Google, Apple veya email/password akışını yürütür.
- Backend yalnız Firebase tarafından imzalanmış token’ı doğrular; client’ın gönderdiği role, organization, ownership veya consent claim’lerini yetki kanıtı saymaz.
- Firebase UID, provider identity ve email verification durumu identity adapter’dan domain actor context’e çevrilir.
- Firebase SDK/provider hatası doğrudan istemciye geçirilmez; RFC 9457 standard error catalog’a dönüştürülür.
- Provider secret, raw token, password, reset artifact veya authorization header loglanmaz.

### 5.2 Email/password

- Email/password hesabı email verification tamamlanmadan korumalı ürün aksiyonlarına erişemez.
- Password reset ve credential recovery Firebase akışına bırakılır.
- Reset link/token süresi dolmuş veya tekrar kullanılmışsa güvenli authentication error döner.
- Password policy ve Firebase project ayarları implementation config kaydında tutulur; parolalar backend DB’ye yazılmaz.

### 5.3 Google ve Apple

- Google/Apple provider identity Firebase UID ile ilişkilendirilir.
- Provider email veya display name, profile alanları için ilk değer olabilir; kullanıcı profile ownership policy’si dışında otomatik overwrite yapılmaz.
- Apple private relay email adresi normal email alanı gibi hassas veri politikasıyla işlenir.
- Provider unlink/link davranışı, hesabın erişimsiz kalmasına yol açmayacak şekilde implementation planında güvenli geçiş olarak tanımlanır.

### 5.4 Token validation ve cache

- Her korumalı request Firebase token validation boundary’sinden geçer.
- Validation sonucu kısa süreli cache’lenebilir; cache TTL 15 dakikayı aşamaz.
- Cache key provider, token fingerprint ve doğrulama bağlamından türetilir; raw token key veya log alanı yapılmaz.
- Kullanıcı disabled, email verification değişikliği veya güvenlik olayı gibi invalidation sinyalleri policy’ye göre cache’i erken düşürebilir.
- Cache hit, membership/ownership/share/consent kontrolünü atlamaz.
- Expired, malformed, wrong audience/issuer veya signature-invalid token `401` standard error üretir.

## 6. Oturum ve cihaz yönetimi

### 6.1 Device session

`DeviceSession` backend’in kullanıcıya ait aktif cihazları yönetebilmesi için tutulur. Minimum alanlar:

- session ID, user ID, provider UID fingerprint
- device/platform metadata’nın güvenli özeti
- first seen, last seen, last authenticated at
- status: `active`, `revoked`, `expired`
- revoke actor, revoke reason ve revoke time

Raw token, cookie, password, push secret veya tam cihaz fingerprint’i kaydedilmez.

### 6.2 Oturum işlemleri

- Kullanıcı aktif cihaz/session listesini görebilir.
- Kullanıcı mevcut cihazını veya seçtiği başka aktif cihazı sonlandırabilir.
- Sonlandırılan device session protected use-case’lerde kabul edilmez; Firebase token doğrulaması ayrıca yapılır.
- Firebase refresh client SDK tarafından yönetilir; backend refresh token saklamaz.
- Password reset sonrası aktif device session’lar güvenlik policy’sine göre revoke edilir.
- Device session mutasyonları audit edilir.

Exact endpoint path, response field isimleri ve client logout UX’i implementation kayıtlarında sabitlenir; davranış sınırları bu bölümden değiştirilemez.

## 7. Public discovery ve auth gate

Aşağıdaki işlemler public okunabilir discovery kapsamındadır; yalnız yayınlanmış ve public-safe alanlar döner:

- tedavi/kategori arama
- klinik/hastane listeleme ve filtreleme
- doktor/tedavi public profil özeti

Aşağıdaki işlemler için geçerli authenticated Patient veya yetkili organization/admin context zorunludur:

- inquiry/lead oluşturma
- dosya upload başlatma/tamamlama/indirme
- mesajlaşma ve WebSocket subscribe/send
- teklif görüntüleme, kabul/red
- randevu ve tedavi journey işlemleri
- profile, consent veya account deletion mutasyonu

Public discovery hiçbir sağlık verisi, unpublished organization data, private contact data veya internal verification/audit alanı döndürmez.

## 8. Genel rıza modeli

### 8.1 Tek genel rıza

MVP’de amaç bazlı ayrı rıza yerine tek genel rıza kaydı tutulur. Rıza kaydı minimum olarak şunları taşır:

- consent record ID ve user ID
- consent text/version identifier
- locale
- accepted/revoked status
- actor/session/device reference
- accepted/revoked timestamp
- request ID ve policy version

Lead paylaşımında recipient-specific veya field-specific consent snapshot alınmaz. Bunun yerine ilgili lead/share policy, genel rıza durumu ve kullanıcının paylaşım aksiyonunu birlikte değerlendirir.

### 8.2 Rıza kontrolü

- Lead oluşturma veya veri paylaşımı genel rıza yoksa başarısız olur.
- Rıza geri çekildiğinde gelecekteki yeni paylaşım ve erişim kararları durur.
- Geri çekme geçmiş audit, yasal saklama veya daha önce gerçekleşmiş delivery kaydını sessizce silmez.
- Consent version değişirse kullanıcıdan yeniden kabul istenir; eski kabul yeni metne otomatik taşınmaz.
- Consent read/write işlemleri audit edilir; rıza metninin ham sağlık veya mesaj içeriğiyle karıştırılması yasaktır.

Consent withdrawal’ın mevcut lead erişimini ve daha önce teslim edilmiş kopyaları nasıl etkilediği, ilgili lead/privacy spec’lerinde bu temel policy’ye aykırı olmadan ayrıntılandırılır.

## 9. Organization membership

### 9.1 Membership state

`OrganizationMembership` aşağıdaki durumları kullanır:

- `pending`: invite oluşturuldu, kullanıcı henüz aktif değil
- `active`: organization policy kapsamında erişim mümkün
- `suspended`: geçici erişim durduruldu
- `revoked`: üyelik sona erdi; yeni erişim mümkün değil

Davet token’ı veya invite secret raw olarak DB/log/context’e yazılmaz. Invite expiration, replay ve resend davranışı implementation kayıtlarında sabitlenir.

### 9.2 Davet ve erişim

- Super admin veya yetkili organization admin invite oluşturabilir.
- Membership active olmadan kuruluş kaynağına erişim verilmez.
- Lead, conversation, file ve message erişimi active membership ile birlikte assignment/share policy’den geçer.
- Client’ın gönderdiği `organizationId`, server-side membership bağlamı yerine kullanılamaz.
- Suspension/revocation yeni erişimi anında durdurur; geçmiş audit kayıtları değişmez.
- Organization admin yalnız kendi organization üyelik kapsamını yönetebilir; super admin dışı global üyelik işlemi yapamaz.

## 10. Account deletion ve anonymization

### 10.1 Soft delete

- Kullanıcı yeniden doğrulama ile account deletion request oluşturur.
- Request açıldığında account yeni login ve ürün mutasyonlarına kapatılabilir; açık işlerin güvenli kapanış policy’si uygulanır.
- Identity bağlantısı, profile PII’si ve ürün kayıtları tek işlemde körlemesine silinmez.
- Legal/audit/operational saklama gerekçesi bulunan kayıtlar retention policy’ye göre ayrıştırılır.
- Anonymization kişisel alanları geri döndürülemez biçimde değiştirir; message/revision ve audit invariants bozulmaz.

### 10.2 Deletion state

`AccountDeletionRequest` minimum state’leri:

- `requested`
- `under_review`
- `scheduled`
- `completed`
- `rejected`
- `cancelled`

Deletion işlemi actor, reason, timestamp, policy version ve audit reference taşır. Exact retention/anonymization field matrix SPEC-012’de kapanır.

## 11. Abuse prevention ve güvenlik

MVP auth boundary’si aşağıdaki kontrolleri zorunlu kılar:

- email verification gate
- auth, password reset, invite ve session endpoint’lerinde rate limit
- brute-force ve credential abuse detection
- reset/invite artifact expiration ve single-use/replay protection
- güvenli generic auth error; email/account enumeration azaltma
- provider failure ve suspicious activity audit
- admin session/membership/deletion işlemlerinde actor ve reason audit’i
- raw token, password, OTP, invite secret ve health/message content redaction’ı

Sayısal rate limit eşikleri, alert threshold’ları ve abuse response runbook’u implementation/operasyon kayıtlarında sabitlenir. 2FA bu MVP sözleşmesine eklenmez.

## 12. API işlem grupları

Exact endpoint isimleri implementation kaydında sabitlenmek üzere aşağıdaki davranış grupları zorunludur:

| İşlem | Aktör | Beklenen sonuç | Durum |
| --- | --- | --- | --- |
| Firebase auth sonucu backend’de doğrula | Authenticated actor | Actor context veya RFC 9457 `401` | Accepted |
| Kendi profile’ını getir/güncelle | Patient veya organization actor | Ownership doğrulanmış profile | Accepted boundary |
| Genel rıza kabul/geri çek | Patient | Versioned consent record + audit | Accepted |
| Device session listele/sonlandır | Authenticated actor | Aktif session görünümü veya revoke sonucu | Accepted |
| Organization invite oluştur/kabul/revoke | Super admin veya organization admin | Membership state + audit | Accepted boundary |
| Korumalı kaynağa eriş | İlgili actor | Role + membership + ownership/assignment/share sonucu | Accepted |
| Account deletion request oluştur/iptal | Patient | Deletion state + audit | Accepted boundary |

Tüm hata cevapları SPEC-002 RFC 9457 catalog’ını kullanır. Başarılı response’lar `/api/v1` ve JSON contract’a uyar. Auth failure ile resource not-found ayrımı güvenlik policy’sini bozmayacak biçimde uygulanır.

## 13. Veri modeli

| Entity | Sorumluluk | Ana invariant |
| --- | --- | --- |
| `UserIdentity` | Firebase UID/provider identity bağlantısı | Firebase UID tek canonical identity’ye bağlanır |
| `UserProfile` | Patient/actor ürün profili | Identity’den ayrı ownership ve soft-delete durumu taşır |
| `DeviceSession` | Cihaz oturumu ve revoke durumu | Raw credential saklanmaz; revoke audit edilir |
| `Organization` | Kuruluş kapsamı | Public profile ile private membership ayrıdır |
| `OrganizationMembership` | Actor–organization ilişkisi | Active değilse organization access yoktur |
| `DoctorProfile` | Organization-managed doktor profili | Bağımsız login/session yoktur |
| `GeneralConsentRecord` | Tek genel rıza sürümü ve durumu | Metin/version/time/actor evidence korunur |
| `AccountDeletionRequest` | Soft delete/anonymization workflow’u | State transition audit edilir |
| `AuthSecurityEvent` | Auth/session/invite/recovery audit referansı | Secret veya raw token içermez |

## 14. Validation, conflict ve transaction kuralları

- Firebase UID, email ve provider identity normalization provider adapter sınırında yapılır.
- Unknown body/query/path alanları hassas auth mutasyonlarında sessizce kabul edilmez.
- Invite accept, membership state ve audit aynı güvenilir transaction/outbox sonucunda tamamlanır.
- Consent accept/revoke ile ilgili user state aynı transaction sınırında güncellenir.
- Aynı deletion request idempotency key ile tekrarlandığında duplicate workflow oluşmaz.
- Aynı invite veya session revoke mutation tekrarlandığında güvenli idempotent sonuç üretilir.
- Active membership, assignment/share veya consent yoksa kaynak erişimi `403` veya güvenlik policy’sine göre `404` olur.
- Stale membership/version değişikliği `409` üretir.
- Firebase/provider/dependency failure güvenli `dependency-unavailable` error code’a çevrilir.

## 15. Audit, log ve privacy

Audit edilmesi gerekenler:

- auth provider bağlama/değiştirme ve verification state
- device session oluşturma/sonlandırma
- password recovery/security event referansı
- consent accept/revoke
- invite oluşturma/kabul/revoke
- membership suspend/revoke
- super admin erişimi ve admin policy değişikliği
- deletion request ve anonymization sonucu

Teknik loglar yalnız request ID, safe actor reference, organization ID, endpoint template, status, duration ve error code gibi metadata taşır. Token, password, secret, invite artifact, health data, message/revision content ve tam contact information yazılmaz.

## 16. Kabul kriterleri

1. Google, Apple ve email/password Firebase auth yöntemleri Accepted MVP sınırı olarak tanımlıdır.
2. Telefon OTP ve 2FA’nın MVP kapsamı dışında olduğu açıkça yazılıdır.
3. Backend token validation ve en fazla 15 dakikalık validation cache ayrımı tanımlıdır.
4. Firebase token/claim’in role, membership, ownership veya consent yerine geçmeyeceği yazılıdır.
5. Device session state, revoke ve raw credential redaction kuralları tanımlıdır.
6. Public discovery ile inquiry/auth gate ayrımı ölçülebilir biçimde tanımlıdır.
7. Patient, organization member/admin, doctor profile ve super admin capability sınırları yazılıdır.
8. Doktor profilinin bağımsız authenticated actor olmadığı belirtilmiştir.
9. Organization invite ve pending/active/suspended/revoked membership state’leri tanımlıdır.
10. Her organization kaynağında active membership + assignment/share check zorunludur.
11. Client organization ID’sinin güvenilir authorization kanıtı olmadığı yazılıdır.
12. Tek genel rıza modeli; version, locale, actor ve timestamp kanıtlarıyla tanımlıdır.
13. Rıza geri çekmenin gelecekteki paylaşımı durdurduğu ve geçmiş audit/legal kaydı sessizce silmediği yazılıdır.
14. Consent version değişiminde yeniden kabul gereksinimi tanımlıdır.
15. Account deletion soft delete + anonymization request olarak tanımlıdır.
16. Deletion state’leri, audit ve retention/legal ayrımı yazılıdır.
17. Email verification, rate limit, brute-force, expiration/replay ve generic auth error kontrolleri zorunludur.
18. Auth, membership, consent ve deletion mutasyonları audit gereksinimine sahiptir.
19. RFC 9457 error catalog, `/api/v1`, idempotency ve conflict davranışları korunur.
20. Bu spec uygulama kodu, schema, migration, Firebase project veya provider secret içermez.

## 17. Bağımlılıklar

- SPEC-002: Node/Nest/Fastify/Prisma, RFC 9457, OpenBao, audit/log/redaction, job ve lifecycle foundation.
- SPEC-004: Patient profile, country/language/currency ve contact preference ayrıntıları.
- SPEC-005: Organization, clinic, doctor ve verification publication modeli.
- SPEC-007: Inquiry/lead assignment, consent check ve paylaşım sonucu.
- SPEC-008: Attachment ownership ve private file access.
- SPEC-011: Authenticated notification preference ve delivery.
- SPEC-012: Retention, anonymization field matrix, audit erişimi ve operational abuse runbook.

## 18. Implementation kayıtları

Foundation ve identity kararları kapatılmıştır. Implementation’da şu kayıtlar ayrıca tutulur:

1. Firebase project/provider config, allowed redirect/origin, email verification ve password policy.
2. Token validation cache implementation, invalidation signal’ları ve güvenli cache key stratejisi.
3. Device session endpoint/field contract ve revoke UX.
4. RFC 9457 auth error code catalog ve `/api/v1` route names.
5. Rate limit/brute-force thresholds, alert policy ve recovery runbook.
6. Invite expiration/resend, membership admin UI/API ve deletion anonymization field matrix.

## 19. Doğrulama planı

Implementation yapıldığında şu gerçek senaryolarla doğrulanmalıdır:

1. Google, Apple ve email/password ile geçerli identity actor context’e çevrilir; invalid provider token güvenli `401` döner.
2. Validation cache hit auth policy’yi atlamaz; membership revoke sonrası korumalı kaynak erişimi kesilir.
3. Public discovery anonymous çalışır; inquiry, upload, messaging, quote ve appointment auth ister.
4. Patient başka patient/organization kaynağını göremez; organization member yalnız active membership + assignment/share ile erişir.
5. Doktor profili public/organization policy’ye göre görünür; bağımsız login/session oluşturulmaz.
6. Invite pending’den active’e yalnız güvenli kabul akışıyla geçer; suspended/revoked membership erişimi durdurur.
7. Consent olmadan lead/share mutasyonu başarısız olur; revoke sonrası yeni paylaşım durur.
8. Consent version değişince eski kabul otomatik geçerli sayılmaz.
9. Device session sonlandırma ve password reset sonrası policy’ye göre session erişimi kapanır.
10. Deletion request hesabı güvenli biçimde kapatır; anonymization audit/legal invariant’larını bozmaz.
11. Auth/reset/invite abuse rate limit ve replay koruması gözlenir; raw secret/token loglanmaz.
12. Super admin conversation/revision erişimi çalışır ve her okuma/admin aksiyonu audit edilir.
