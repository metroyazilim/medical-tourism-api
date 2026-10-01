# SPEC-006 — Keşif, Arama, Filtre ve Favoriler

- **Durum:** Accepted — grouped decision gate tamamlandı; implementation başlamadı
- **Tarih:** 1 Ekim 2026
- **Tür:** Public discovery, search, filter and favorites specification
- **Bağımlılık:** SPEC-002 Platform Foundation, SPEC-004 Patient Profile, SPEC-005 Directory
- **Uygulama durumu:** Başlanmadı
- **Discovery kapsamı:** Organization + doctor + treatment
- **Search stratejisi:** PostgreSQL-first
- **Pagination:** Cursor; default 20, maximum 50
- **Favorites:** Authenticated patient-only private state
- **Consistency:** PostgreSQL authoritative + synchronous public guards

## 1. Amaç

Bu spec; anonymous veya authenticated kullanıcının yayınlanmış kuruluş, doktor ve tedavi kayıtlarını güvenli biçimde aramasını, allowlist filtrelerle daraltmasını, deterministic sıralama ve cursor pagination ile gezmesini ve authenticated patient olarak favori kaydetmesini tanımlar.

Keşif yüzeyi yalnız SPEC-005 tarafından `published`, `verified`, `active` ve `public-safe` kabul edilen projection’ları döndürür. PostgreSQL canonical kaynaktır; ölçülmüş ihtiyaç olmadan ayrı search service veya vector/AI search eklenmez.

## 2. Kapsam

### 2.1 Kapsam içinde

- Public organization, doctor ve treatment discovery.
- Organization/doctor/treatment detay projection’ları.
- PostgreSQL full-text/trigram veya indexed-query tabanlı arama.
- Allowlisted filter ve deterministic sort.
- Locale-aware Unicode/case/accent normalization.
- BCP 47 request locale ve deterministic fallback.
- Cursor pagination; default 20, maximum 50.
- Authenticated patient organization/doctor/treatment favorites.
- Publication/verification/active/public-safe synchronous guard’ları.
- Optional cache invalidation ve stale-private-result engeli.

### 2.2 Kapsam dışında

- Vector search, embedding, LLM veya AI ranking.
- Harici Meilisearch, Typesense, OpenSearch veya benzeri zorunlu search service.
- Public popularity skorunu favorites ile değiştirme.
- Sponsored result, advertisement veya paid placement.
- Inquiry/lead oluşturma; SPEC-007.
- Location’ın bağımsız searchable entity olması; location organization projection/filter alanıdır.
- Organization/doctor/treatment yönetim mutasyonları; SPEC-005.

## 3. Kabul edilmiş kararlar

| Karar | Accepted seçim | Sınır / not |
| --- | --- | --- |
| Discovery entity’leri | Organization + doctor + treatment | Location ayrı result entity değildir |
| Auth | Public anonymous read | Favorites ve protected işlemler auth ister |
| Search engine | PostgreSQL-first | Ayrı index ölçülmüş ihtiyaç olmadan eklenmez |
| Filters | Allowlisted | Raw ORM/SQL/filter expression alınmaz |
| Sort | Deterministic relevance | Stable ID tie-breaker zorunlu |
| Locale/text | Locale-aware normalized text | Unicode + case/accent-insensitive; vector/AI yok |
| Pagination | Cursor; default 20, max 50 | Invalid cursor RFC 9457 validation error |
| Empty result | HTTP 200 + empty data/page info | Not-found değildir |
| Favorites | Authenticated patient; organization/doctor/treatment | Private, idempotent; ranking’i etkilemez |
| Consistency | DB authoritative + synchronous public guard | Optional cache state/expiry değişiminde invalidate edilir |

## 4. Discovery projection’ları

### 4.1 Organization result

Organization list/detail projection’ı yalnız public-safe alanları taşır. Candidate alanlar:

- public organization ID, display name ve type
- public description/media reference
- published active location özetleri
- country/city ve supported languages
- linked published treatment özetleri
- verification/publication badge metadata’sı
- public doctor özetleri

Membership, invite, internal contact, verification evidence, admin note, private document veya audit field’ı dönmez.

### 4.2 Doctor result

Doctor result organization-managed public projection’dır:

- public doctor ID ve display name
- published organization bağlantıları
- specialties/treatment associations
- languages ve public qualification summary
- public verification badge

Unpublished organization link’i, private contact, identity/evidence alanı veya internal note dönmez.

### 4.3 Treatment result

Treatment result curated catalog projection’ıdır:

- stable public ID/code/slug
- category relation
- locale-aware display name/description
- published organization count veya links; exact aggregation implementation kaydında
- deprecation/publication state’in public-safe karşılığı

Draft, archived veya public policy’ye göre deprecated kayıt yeni discovery result’ına girmez.

## 5. Search stratejisi

### 5.1 PostgreSQL-first

- PostgreSQL canonical kaynaktır.
- Text search PostgreSQL full-text, trigram veya ölçülmüş query/index kombinasyonuyla uygulanır.
- Search-specific denormalized projection yalnız doğruluk ve ölçülmüş performans ihtiyacıyla eklenir.
- Harici search service, dual-write veya eventual-consistency pipeline MVP requirement değildir.
- Query plan/index kararları implementation’da gerçek veri ve ölçümle sabitlenir.

### 5.2 Query sınırı

- Query metni normalize edilmeden önce uzunluk/control-character validation’dan geçer.
- Empty query allowlisted filters ile browse davranışına dönüşebilir.
- Raw SQL fragment, ORM filter veya sort expression client’tan alınmaz.
- Search query teknik loglarda yalnız güvenli/minimize edilmiş metadata ile işlenir; kullanıcı kaynaklı serbest metin körlemesine loglanmaz.
- Query sağlık verisi veya inquiry açıklaması taşıyan bir kanal değildir.

## 6. Allowlisted filtreler

### 6.1 Organization filtreleri

- country ve city/location
- linked treatment/category
- supported language
- organization type
- verification/publication uygunluğu; public client yalnız public-safe seçenekleri kullanır

### 6.2 Doctor filtreleri

- organization
- specialty/treatment
- supported language
- country/city location association

### 6.3 Treatment filtreleri

- category
- locale/language availability
- linked published organization

Her endpoint kendi allowlist’ini tanımlar. Bilinmeyen filter/sort alanı sessizce yok sayılmaz; RFC 9457 validation error üretir. Filter listeleri bounded’dır; aşırı cardinality veya sınırsız `IN` listesi kabul edilmez.

Bütçe/fiyat filtresi bu spec’te yoktur; canonical quote/fiyat modeli SPEC-009’dan önce discovery’ye eklenmez.

## 7. Locale-aware normalized text

- Request locale BCP 47 tag’idir.
- Unicode normalization, locale-aware case folding ve accent/diacritic-insensitive karşılaştırma uygulanır.
- Supported locale alanları catalog/config allowlist’inden gelir.
- İstenen locale’da çeviri yoksa deterministic fallback sırası uygulanır: exact locale → base language → platform default.
- Fallback sonucu response metadata’sında güvenli biçimde belirtilebilir.
- Unknown/unsupported locale validation error veya documented platform default davranışı üretir; endpoint’ler arasında farklılaşmaz.
- Stemming/analyzer veya synonym catalog eklenirse versioned implementation kaydı gerekir.
- Vector/semantic/AI search bu MVP’de yoktur.

## 8. Sıralama

### 8.1 Default ordering

Default sıralama deterministic relevance’tır. Relevance candidate sinyalleri:

- normalized text match quality
- exact code/name match
- filter completeness
- publication/verification validity
- configured public quality/completeness signal

Favorites sayısı, ücretli placement veya gizli ticari ağırlık relevance’ı etkilemez.

### 8.2 Stable ordering

- Her sort stable public ID tie-breaker kullanır.
- Aynı query/filter/snapshot bağlamında pagination duplicate veya kayıp üretmemelidir.
- İzinli alternatif sort’lar endpoint allowlist’inde tanımlanır; örneğin name ascending veya publication date yalnız ürün kararıyla.
- Client arbitrary sort expression gönderemez.

## 9. Cursor pagination

### 9.1 Contract

- Default `limit = 20`.
- Maximum `limit = 50`.
- Limit sıfır, negatif veya maksimum üstü ise validation error.
- Cursor opaque ve client tarafından oluşturulamaz/değiştirilemez.
- Cursor query/filter/sort/locale bağlamına bağlıdır; farklı bağlamda tekrar kullanımı reddedilir.
- Invalid, malformed, expired veya incompatible cursor RFC 9457 validation error üretir.
- Empty result HTTP `200` ve boş item listesi/page metadata döndürür.

### 9.2 Consistency

Cursor; sort key, stable ID ve gerekirse safe query context/version taşır. Ham private field, SQL fragment veya secret içermez. Publication/verification değişimi nedeniyle bir kayıt public olmaktan çıkarsa sonraki page’de synchronous guard ile döndürülmez.

## 10. Favorites

### 10.1 Kapsam

Authenticated `Patient` şu entity’leri favorileyebilir:

- organization
- doctor
- treatment

Favorites private per-user state’tir. Başka kullanıcı, organization veya public discovery favorite listesini göremez.

### 10.2 Davranış

- Add idempotent’tir; aynı entity tekrar eklenince duplicate row/event oluşmaz.
- Remove idempotent’tir; olmayan favorite’ı silmek güvenli tanımlı sonuç üretir.
- Favorite listesi cursor pagination kullanır.
- Favori entity unpublished/suspended/expired olursa public detail dönmez; favorite state tombstone/unavailable metadata ile veya policy’ye göre listeden gizlenir. Tek strateji implementation kaydında sabitlenir.
- Favorites public ranking, verification veya publication state’ini etkilemez.
- Account deletion/anonymization favorites state’ini SPEC-012 policy’sine göre siler/anonymize eder.

## 11. DB authoritative ve cache consistency

- Her public query publication, verification, active ve public-safe guard’larını authoritative DB state üzerinden uygular.
- Cache opsiyoneldir; correctness için zorunlu değildir.
- Publication, suspension, expiry, doctor link veya treatment state değişiminde ilgili cache key/projection invalidate edilir.
- Cache stale ise private/unpublished kayıt döndürmek yerine DB guard veya cache bypass uygulanır.
- Cache key query, filter, locale, sort ve cursor context’ini güvenli/canonical biçimde ayırır.
- Private patient favorite state shared public cache’e girmez.
- Cache invalidation failure görünür operasyon error/metric üretir; sessizce stale-private-result kabul edilmez.

## 12. API işlem grupları

Exact endpoint isimleri implementation kaydında sabitlenmek üzere aşağıdaki davranış grupları zorunludur:

| İşlem | Aktör | Beklenen sonuç | Durum |
| --- | --- | --- | --- |
| Organization ara/listele | Anonymous veya Patient | Public-safe cursor page | Accepted |
| Doctor ara/listele | Anonymous veya Patient | Public-safe cursor page | Accepted |
| Treatment ara/listele | Anonymous veya Patient | Public-safe cursor page | Accepted |
| Organization/doctor/treatment detail getir | Anonymous veya Patient | Published + verified + active projection veya güvenli `404` | Accepted |
| Favorite ekle/çıkar | Authenticated Patient | Idempotent private favorite state | Accepted |
| Favorites listele | Authenticated Patient | Private cursor page + availability state | Accepted |

Tüm işlemler `/api/v1`, SPEC-002 RFC 9457 JSON Problem Details, request ID, Zod validation ve cursor foundation kurallarına uyar.

## 13. Veri modeli

| Entity | Sorumluluk | Ana invariant |
| --- | --- | --- |
| `DiscoveryQuery` | Parse edilmiş query/filter/sort/locale context | Ham SQL/ORM expression içermez |
| `PublicOrganizationProjection` | Organization public-safe result | Published + verified + active guard |
| `PublicDoctorProjection` | Doctor public-safe result | En az bir uygun public organization link’i |
| `PublicTreatmentProjection` | Curated treatment public result | Published/active catalog state |
| `PatientFavorite` | Patient–entity private relation | `(patientId, entityType, entityId)` unique |
| `SearchCursor` | Opaque pagination state | Query/filter/sort/locale context’ine bağlı |

Physical materialized view veya denormalized table zorunlu değildir; ölçüm sonucu implementation’da seçilebilir.

## 14. Validation, conflict ve hata kuralları

- Query, filter, sort, locale, limit ve cursor ayrı Zod boundary schema’larıyla doğrulanır.
- Query length, filter list cardinality ve total parameter limits bounded’dır.
- Unsupported filter/sort/locale RFC 9457 validation error üretir.
- Public detail unpublished/private entity için güvenli `404` döndürür.
- Invalid cursor validation error’dır; empty result not-found değildir.
- Favorite target type allowlist dışındaysa validation error.
- Favorite target public değilse public detail açılmaz; add policy’si implementation’da consistent biçimde reject veya unavailable state olarak tanımlanır.
- Aynı favorite add/remove isteği idempotent’tir.
- Search dependency/DB timeout güvenli dependency-unavailable error’a çevrilir; raw query plan veya SQL dönmez.

## 15. Audit, log ve privacy

- Public search query’leri ham serbest metin olarak uzun süreli teknik loga yazılmaz; gerekirse normalized length, filter names, locale, duration, result count ve request ID gibi metadata tutulur.
- Patient favorite add/remove ve list access private product event’idir; actor ve target reference audit/analytics policy’sine göre tutulabilir.
- Public response membership, evidence, admin note, private contact, patient profile veya health data içermez.
- Abuse/rate-limit event’leri raw query veya PII sızdırmadan kaydedilir.
- Search analytics ileride eklenirse consent/privacy/retention kararı olmadan user-level behavior warehouse’a gönderilmez.

## 16. Kabul kriterleri

1. Public discovery organization, doctor ve treatment entity’lerini kapsar.
2. Anonymous discovery yalnız published + verified + active + public-safe projection döndürür.
3. PostgreSQL canonical ve ilk search engine olarak tanımlıdır.
4. Ölçülmüş ihtiyaç olmadan harici search service veya vector/AI search eklenmez.
5. Organization, doctor ve treatment filter allowlist’leri tanımlıdır.
6. Raw ORM/SQL/filter/sort expression client’tan alınmaz.
7. Locale-aware Unicode, case ve accent normalization tanımlıdır.
8. BCP 47 locale fallback deterministic’tir.
9. Default sort deterministic relevance ve stable ID tie-breaker kullanır.
10. Favorites, sponsored placement veya gizli ticari ağırlık relevance’ı etkilemez.
11. Cursor pagination default 20 ve maximum 50 olarak tanımlıdır.
12. Invalid cursor RFC 9457 validation error; empty result HTTP 200 + empty page üretir.
13. Patient organization, doctor ve treatment favorileyebilir; favorite state private ve idempotent’tir.
14. Favorites public ranking’i veya publication state’ini etkilemez.
15. DB public guards her request’te uygulanır; stale cache private/unpublished kayıt döndüremez.
16. Publication/verification/expiry değişimleri cache invalidation gerektirir.
17. Public response private membership, evidence, audit, patient veya health data içermez.
18. Bu spec uygulama kodu, schema, migration, harici search provider veya analytics warehouse içermez.

## 17. Bağımlılıklar

- SPEC-002: PostgreSQL/Prisma, UUID/Zod, RFC 9457, cursor pagination, audit/log/redaction foundation.
- SPEC-003: Anonymous discovery ve authenticated Patient authorization boundary.
- SPEC-004: Patient locale/currency preferences, privacy ve favorites ownership.
- SPEC-005: Organization/doctor/treatment publication, verification ve public-safe projection.
- SPEC-007: Discovery’den inquiry oluşturma ve organization selection.
- SPEC-012: Search/favorites retention, analytics privacy ve account deletion cleanup.

## 18. Implementation kayıtları

SPEC-006 ürün ve query kararları kapatılmıştır. Implementation’da şu kayıtlar ayrıca tutulur:

1. PostgreSQL full-text/trigram/index query planı ve gerçek veriyle ölçüm sonucu.
2. Supported filter/sort catalog ve maximum query/filter cardinality limits.
3. Locale fallback, normalization, synonym/stemming policy ve supported locale catalog.
4. Cursor encoding/version/expiry ve query-context binding formatı.
5. Favorite target unavailable/tombstone davranışı.
6. Public cache key, TTL, invalidation ve stale-cache bypass strategy.

## 19. Doğrulama planı

Implementation yapıldığında şu gerçek senaryolarla doğrulanmalıdır:

1. Anonymous organization, doctor ve treatment search yalnız published/verified/active/public-safe kayıt döndürür.
2. Suspended, expired veya unpublished kayıt aynı request’te public result’tan çıkar.
3. Country/city/treatment/language/specialty filtreleri allowlist dışında alan kabul etmez.
4. Unicode, case ve accent varyasyonları locale-aware normalized matching ile aynı güvenli sonucu üretir.
5. Locale fallback exact → base → platform default sırasını uygular.
6. Aynı relevance skorundaki sonuçlar stable ID tie-breaker ile deterministik sıralanır.
7. Cursor page geçişi duplicate veya kayıp üretmez; farklı query bağlamındaki cursor reddedilir.
8. Limit default 20, maximum 50’dir; invalid limit/cursor RFC 9457 error üretir.
9. Empty result `200` ve boş page döndürür.
10. Patient organization/doctor/treatment favorite add/remove işlemlerini idempotent yapar; başka kullanıcı favorites’ını göremez.
11. Favorite count public ranking’i değiştirmez.
12. Publication/verification değişiminden sonra stale cache private/unpublished kayıt döndürmez.
13. Raw search query, membership, evidence, patient profile veya health data teknik log ve public response’a sızmaz.
