# SPEC-005 — Kuruluş, Doktor, Tedavi ve Doğrulama Dizini

- **Durum:** Accepted — grouped decision gate tamamlandı; implementation başlamadı
- **Tarih:** 1 Ekim 2026
- **Tür:** Organization, doctor, treatment catalog and verification specification
- **Uygulama durumu:** Başlanmadı
- **Bağımlılık:** SPEC-002 Platform Foundation, SPEC-003 Identity/Session/Roles
- **Organization modeli:** Organization + locations
- **Publication:** Draft → submitted → in_review → verified → published
- **Doctor modeli:** Organization-managed multi-organization profile
- **Treatment modeli:** Curated admin catalog
- **Public listing:** Published + verified + active + public-safe
- **Verification:** Evidence + expiry + re-verification

## 1. Amaç

Bu spec; sağlık kuruluşlarının, fiziksel lokasyonlarının, doktor profillerinin, tedavi/kategori kataloğunun ve super admin doğrulama/yayın kararlarının sınırlarını tanımlar.

Amaç; public discovery’ye yalnız doğrulanmış ve yayınlanmış public-safe kayıtları çıkarmak, kuruluş üyeliği ile katalog/public profil sahipliğini ayırmak ve verification evidence/expiry kararlarını audit edilebilir hale getirmektir.

## 2. Kapsam

### 2.1 Kapsam içinde

- `Organization` aggregate’i ve birden çok `Location` ilişkisi.
- Organization draft/profile alanları ve publication state machine.
- Organization verification evidence, expiry ve re-verification.
- Organization-managed, multi-organization `DoctorProfile`.
- Curated super admin-managed treatment/category catalog.
- Organization’ın canonical treatment kayıtlarına kendi offer/detail alanlarını bağlaması.
- Owner/admin/editor/viewer organization capability preset’leri.
- Public listing projection ve public-safe field policy.
- Verification, publication, suspension ve expiry audit davranışları.

### 2.2 Kapsam dışında

- Hasta discovery query/filter/favorites; SPEC-006.
- Inquiry/lead assignment ve state history; SPEC-007.
- Private file storage, malware scan ve signed access; SPEC-008.
- Treatment quote, price negotiation veya appointment; SPEC-009/010.
- Harici verification provider entegrasyonu.
- Concierge/service provider dizini; mevcut MVP dışında.
- AI/LLM tabanlı profile veya treatment moderation.

## 3. Kabul edilmiş kararlar

| Karar | Accepted seçim | Sınır / not |
| --- | --- | --- |
| Organization | Organization + locations | Organization aggregate’i bir veya çok location taşır |
| Publication | Draft → submitted → in_review → verified → published | rejected/suspended/expired public görünürlüğü keser |
| Doctor | Organization-managed multi-organization profile | Bağımsız login/session yok; organization bağlantıları ayrı tutulur |
| Treatment | Curated admin catalog | Super admin canonical category/treatment yönetir |
| Verification | Evidence + expiry + re-verification | Karar, gerekçe ve evidence referansı audit edilir |
| Organization roles | Owner/admin/editor/viewer | Active membership ve resource assignment/share kontrolleri ayrıca uygulanır |
| Public listing | Published + verified + active + public-safe | Unpublished, suspended, expired veya private alanlar listelenmez |

## 4. Organization ve location modeli

### 4.1 Organization

`Organization` bir hastane/klinik tüzel veya ürün içindeki sağlık kuruluşu sınırıdır. Minimum kavramsal alanlar:

- organization ID ve legal/display name
- organization type ve status
- public description, country ve supported locale references
- verification/publication state
- primary contact reference; raw secret veya gereksiz kişisel veri yok
- created/updated timestamps
- owner/admin membership reference

Organization public profile, private membership ve verification evidence’ı aynı response aggregate’inde ham biçimde döndürmez.

### 4.2 Location

Bir organization sıfır, bir veya birden çok physical `Location` taşıyabilir. Location minimum olarak:

- location ID ve organization ID
- public-safe address/city/country projection
- timezone veya IANA zone reference
- contact/display fields policy’si
- active/inactive state

Private contact, internal note, verification evidence ve exact sensitive address alanları public projection’a otomatik girmez. Location state inactive ise yeni public listing’e dahil edilmez.

### 4.3 Ownership

- Organization owner/admin, organization draft/profile ve location alanlarını policy’ye göre yönetir.
- Super admin verification/publication/suspension kararlarının sahibidir.
- Client organization ID’si authorization kanıtı değildir; active membership server-side çözülür.
- Organization profile değişikliği publication state’i ve re-review policy’sini tetikleyebilir.

## 5. Publication state machine

### 5.1 State’ler

- `draft`: kuruluş veya yetkili organization member düzenliyor; public değildir.
- `submitted`: kuruluş review talebi gönderdi; yetkili değişiklik kısıtları uygulanır.
- `in_review`: super admin verification incelemesi sürüyor.
- `verified`: evidence yeterli bulundu; publication kararı henüz public olmayabilir.
- `published`: public listing’e çıkmaya uygun; public-safe projection üretilebilir.
- `rejected`: review gerekçesiyle geri gönderildi; kuruluş düzeltip tekrar submit edebilir.
- `suspended`: güvenlik, policy, expiry veya admin kararıyla public erişim durdu.
- `expired`: verification/evidence süresi geçerli değil; re-verification gerekir.

### 5.2 İzinli geçişler

- `draft → submitted`
- `submitted → in_review`
- `in_review → verified | rejected | suspended`
- `verified → published | suspended | expired`
- `published → draft | suspended | expired`
- `rejected → draft`
- `suspended → in_review | verified | rejected`
- `expired → in_review`

Super admin dışında hiç kimse `verified`, `published`, `suspended` veya `expired` kararını doğrudan client alanı ile yazamaz.

### 5.3 Publication ve verification ayrımı

Verification evidence yeterli olsa bile public publication ayrı bir state transition’dır. Public listing için bütün koşullar birlikte sağlanmalıdır:

1. Organization state `published`.
2. Verification state geçerli ve `verified`.
3. Organization/location active.
4. Evidence expiry geçmemiş.
5. Public-safe field policy geçerli.
6. Related doctor/treatment projection’ları kendi publication policy’sini sağlıyor.

## 6. Verification evidence ve re-verification

### 6.1 Evidence

Verification request evidence referanslarıyla oluşturulur. Evidence binary içeriği bu spec’te tutulmaz; private file/attachment sınırı SPEC-008’dedir. Minimum metadata:

- evidence ID/type ve organization/doctor subject
- issuer/reference metadata’nın güvenli özeti
- submitted/reviewed timestamps
- expiry veya review due date
- reviewer actor ve decision reason reference
- evidence status: `submitted`, `accepted`, `rejected`, `expired`

Raw belge, lisans numarası veya hassas kişisel veri teknik loga yazılmaz.

### 6.2 Re-verification

- Evidence expiry yaklaşınca organization/doctor review queue’ya alınabilir.
- Expiry geçerse ilgili subject public listing’den çıkarılır veya state `expired` olur.
- Re-verification yeni evidence/version ve yeni admin decision üretir; eski decision audit history’de kalır.
- Super admin gerekçe olmadan verification’ı sessizce değiştirip history’yi silemez.

## 7. DoctorProfile modeli

### 7.1 Organization-managed multi-org

- Doctor bağımsız authenticated actor değildir.
- `DoctorProfile` birden çok organization bağlantısına sahip olabilir.
- Her bağlantı organization ID, role/context, active state, publication projection ve verification reference taşır.
- Aynı kişi için duplicate profile merge/identity resolution implementation kayıtlarında tanımlanır; public API raw identity matching bilgisi açmaz.
- Doctor public profile yalnız bağlı organization ve doctor publication/verification policy’si izin veriyorsa görünür.

### 7.2 Doctor alanları

Public-safe candidate alanlar:

- display name
- specialties/treatment associations
- language references
- organization/location associations
- qualification summary ve public verification badge
- public biography ve media reference policy’si

Private contact, identity document, internal note, unverified claim ve evidence binary’si public response’a girmez.

Doctor profile değişiklikleri organization editor/admin policy’si ile yapılır; verification/publication kararları super admin’e aittir.

## 8. Curated treatment/category catalog

### 8.1 Admin ownership

- Super admin canonical `TreatmentCategory` ve `Treatment` kayıtlarını yönetir.
- Organization canonical treatment’ı kendi profile/offer/detail context’ine bağlayabilir; treatment’ın canonical adını veya category ilişkisini client’tan serbestçe değiştiremez.
- Treatment/category code ve slug stable olmalıdır.
- Display name, description ve search label’ları locale bazlı yönetilir.
- Unpublished/inactive treatment public discovery’ye girmez.

### 8.2 Catalog state

- `draft`: admin düzenleme alanı; public değildir.
- `published`: public-safe catalog listing’e uygun.
- `deprecated`: yeni association’a kapalı; mevcut reference policy’ye göre korunabilir.
- `archived`: public ve yeni association dışında; audit/reference için tutulabilir.

Treatment category ile treatment arasında parent/child ilişkisi circular olmamalıdır. Rename/deprecate işlemleri stable code ve migration/reference policy’siyle yapılır.

### 8.3 Organization treatment details

Organization kendi linked treatment detail alanlarını yönetebilir:

- availability/active state
- public-safe description
- location association
- indicative display metadata

Fiyat, quote, currency calculation ve availability guarantee bu spec’in kapsamı değildir; SPEC-009 veya ilgili feature spec’inde kapanır.

## 9. Organization capability matrisi

| Preset | Profile/location | Members | Doctor links | Treatment links | Verification/publication |
| --- | --- | --- | --- | --- | --- |
| Owner | Yönetebilir | Yönetebilir | Yönetebilir | Yönetebilir | Submit edebilir; karar veremez |
| Admin | Yönetebilir | Policy’ye göre yönetebilir | Yönetebilir | Yönetebilir | Submit edebilir; karar veremez |
| Editor | İzinli edit alanları | Yönetemez | İzinli edit | İzinli edit | Submit edemez veya policy’ye göre draft hazırlar |
| Viewer | Read-only public/private projection | Read-only | Read-only | Read-only | Karar veremez |

Bu preset’ler active membership, resource assignment/share, patient consent ve aggregate state kontrollerinin yerine geçmez. Super admin global capability’ye sahiptir ve bütün admin kararları audit edilir.

## 10. Public listing projection

Public endpoint’ler yalnız şu koşulları sağlayan subject’leri döndürür:

- `published` publication state
- `verified` ve expiry geçerli verification
- active organization/location/doctor/treatment
- public-safe field policy
- ilgili locale/country catalog mapping

Public response aşağıdakileri içermez:

- verification evidence binary veya private issuer data
- internal admin note/review reason’ın hassas içeriği
- membership, invite, assignment veya private contact metadata
- unpublished treatment/doctor/location
- raw audit/security event

Public listing cache’leri state/expiry/publication değişiminde invalidate edilir. Stale private veya suspended kayıt public response’a sızmaz.

## 11. API işlem grupları

Exact endpoint path’leri implementation kaydında sabitlenmek üzere aşağıdaki davranış grupları zorunludur:

| İşlem | Aktör | Beklenen sonuç | Durum |
| --- | --- | --- | --- |
| Organization draft/profile oluştur/güncelle | Owner/admin | Validated draft + audit | Accepted boundary |
| Location ekle/güncelle/disable et | Owner/admin/editor policy | Organization location state + audit | Accepted boundary |
| Verification submit/review/decision | Organization actor/super admin | Evidence state + decision + audit | Accepted |
| Publication state değiştir | Super admin | State transition veya RFC 9457 conflict/forbidden | Accepted |
| Doctor profile/link yönet | Organization actor/super admin | Organization-managed doctor association | Accepted boundary |
| Treatment/category catalog yönet | Super admin | Curated catalog state/version | Accepted |
| Organization treatment link/detail yönet | Owner/admin/editor policy | Public-safe linked detail | Accepted boundary |
| Public organization/doctor/treatment getir | Anonymous/patient | Published + verified + public-safe projection | Accepted |

Tüm işlemler `/api/v1`, RFC 9457, request ID, audit ve optimistic concurrency foundation kurallarına uyar.

## 12. Veri modeli

| Entity | Sorumluluk | Ana invariant |
| --- | --- | --- |
| `Organization` | Kuruluş aggregate’i | Public state ve verification ayrı kontrol edilir |
| `OrganizationLocation` | Fiziksel/servis lokasyonu | Organization ownership; inactive location public değildir |
| `OrganizationPublication` | Publication state/history | Client state override edemez; geçiş audit edilir |
| `VerificationRecord` | Evidence, expiry ve admin decision | Subject, reviewer, reason ve timestamps korunur |
| `DoctorProfile` | Organization-managed doktor | Bağımsız login/session yoktur |
| `DoctorOrganizationLink` | Doctor–organization association | Active/public state ve context ayrı tutulur |
| `TreatmentCategory` | Curated category catalog | Stable code; circular parent yok |
| `Treatment` | Curated treatment catalog | Category, locale ve publication policy’ye uyar |
| `OrganizationTreatment` | Kuruluşun canonical treatment link/detail’i | Canonical treatment ownership admin’dedir |
| `DirectoryAuditEvent` | Verification/publication/catalog audit’i | Evidence binary veya raw secret içermez |

## 13. Validation, conflict ve transaction kuralları

- Organization, location, doctor link, treatment link ve verification payload’ları ayrı Zod boundary schema’larıyla doğrulanır.
- Country, locale, treatment code ve stable slug canonical catalog/standard policy’ye uyar.
- State transition yalnız merkezi publication/verification policy’den geçer.
- Aynı organization/treatment/doctor association duplicate side effect üretmez; idempotency key tekrarında aynı sonuç döner.
- Stale publication, verification veya catalog version `409` üretir.
- Verification decision, evidence status ve audit reference güvenilir transaction/outbox sonucu oluşturur.
- Evidence expiry job/state update idempotent’tir; expired subject public listing’den güvenli çıkarılır.
- Organization editor/admin başka organization kaynağını membership üzerinden bypass edemez.
- Public projection private field veya unpublished state içermiyorsa response’a çevrilebilir.
- Catalog deprecation mevcut historical reference’ları bozmaz; yeni association policy ile engellenebilir.

## 14. Audit, log ve privacy

Audit edilmesi gerekenler:

- organization/location profile değişiklikleri
- organization membership veya capability ile yapılan directory mutation’ları
- verification submit, review, accept, reject, suspend, expire ve re-verification
- publication state transition’ları
- doctor organization link ve public profile değişiklikleri
- treatment/category create, update, publish, deprecate ve archive
- public visibility değişiklikleri ve admin override’ları

Teknik loglar raw evidence, license/identity number, private contact, internal review note, patient health data veya full profile payload taşımaz. Audit kayıtları actor, target, decision, reason reference, request ID ve timestamps ile append-oriented tutulur.

## 15. Kabul kriterleri

1. Organization + locations modeli tanımlıdır.
2. Organization publication state’leri draft, submitted, in_review, verified, published, rejected, suspended ve expired olarak tanımlıdır.
3. Publication state transition’ları merkezi policy ile sınırlandırılmıştır.
4. Public listing için published + verified + active + public-safe koşulları birlikte zorunludur.
5. Verification evidence, expiry ve re-verification davranışı tanımlıdır.
6. Evidence expiry public listing’den otomatik güvenli çıkarma/review gereksinimi üretir.
7. DoctorProfile organization-managed multi-organization modelidir; bağımsız login/session yoktur.
8. Doctor–organization link state ve public projection ayrı tutulur.
9. Treatment/category catalog super admin tarafından curated olarak yönetilir.
10. Treatment stable code/slug, locale display ve publication/deprecation policy’sine uyar.
11. Organization yalnız canonical treatment’a linked detail/offer metadata ekleyebilir.
12. Owner/admin/editor/viewer capability preset’leri ve active membership sınırı tanımlıdır.
13. Organization actor verification/publication kararını client state ile override edemez.
14. Public response private membership, evidence, audit ve unpublished fields içermez.
15. Verification/publication/catalog mutation’ları audit edilir.
16. State, evidence, catalog ve link mutation’ları idempotency/conflict kurallarına uyar.
17. Organization/location/doctor/treatment verileri public projection ile private modelden ayrılır.
18. Bu spec uygulama kodu, schema, migration, external verification provider veya file storage implementation’ı içermez.

## 16. Bağımlılıklar

- SPEC-002: Node/Nest/Fastify/Prisma, UUID/Zod, RFC 9457, audit/log/redaction ve lifecycle foundation.
- SPEC-003: Firebase identity, organization membership, owner/admin/editor/viewer capability boundary ve super admin.
- SPEC-004: Patient locale/country/currency preferences ve public discovery auth boundary.
- SPEC-006: Directory search/filter/favorites ve public listing query davranışı.
- SPEC-007: Inquiry/lead organization assignment ve patient share policy.
- SPEC-008: Verification evidence/private file metadata ve signed access.
- SPEC-012: Retention, verification evidence privacy, audit access ve operational review.

## 17. Implementation kayıtları

SPEC-005 ürün ve authorization kararları kapatılmıştır. Implementation’da şu kayıtlar ayrıca tutulur:

1. Organization type/location field catalog ve supported public-safe fields.
2. Publication/verification transition guard matrix ve expiry scheduler policy.
3. Doctor identity duplicate/merge ve multi-organization link resolution strategy.
4. Treatment/category locale catalog, stable code/slug ve deprecation migration policy.
5. Owner/admin/editor/viewer capability-to-endpoint matrix.
6. Exact endpoint names, public projection DTO’ları ve public cache invalidation strategy.

## 18. Doğrulama planı

Implementation yapıldığında şu gerçek senaryolarla doğrulanmalıdır:

1. Organization draft oluşturulur; client doğrudan published/verified state yazamaz.
2. Location ekleme, disable etme ve organization ownership kontrolleri çalışır.
3. Submitted → in_review → verified → published akışı yalnız izinli actor’larla ilerler.
4. Rejected, suspended veya expired organization public discovery’den çıkar.
5. Evidence expiry review/re-verification işi idempotent çalışır ve audit üretir.
6. Doctor aynı profile ile birden çok organization’a bağlanabilir; bağımsız login/session oluşmaz.
7. Doctor unpublished veya unverified ise public response’a girmez.
8. Super admin canonical treatment/category oluşturur ve organization custom canonical code’u değiştiremez.
9. Deprecated treatment yeni association’a policy’ye göre kapanır; historical reference korunur.
10. Owner/admin/editor/viewer capability’leri endpoint ve resource scope’unda ayrılır.
11. Public response private membership, evidence, audit ve unpublished alanları içermez.
12. Verification/publication/catalog mutasyonları actor, target, reason, request ID ve timestamp ile audit edilir.
