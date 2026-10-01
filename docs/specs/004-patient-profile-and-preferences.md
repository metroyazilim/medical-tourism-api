# SPEC-004 — Hasta Profili ve Tercihler

- **Durum:** Accepted — grouped decision gate tamamlandı; implementation başlamadı
- **Tarih:** 1 Ekim 2026
- **Tür:** Patient profile, preferences and ownership specification
- **Bağımlılık:** SPEC-002 Platform Foundation, SPEC-003 Kimlik/Oturum/Rıza/Roller
- **Uygulama durumu:** Başlanmadı
- **Profile modeli:** Minimum identity profile + ayrı preferences
- **Visibility:** Private by default + explicit share
- **Deletion:** Field-level anonymization matrix

## 1. Amaç

Bu spec; hastanın minimum profil alanlarını, dil/locale/para birimi ve iletişim tercihlerini, profile sahipliğini, private görünürlüğü ve account deletion sonrası alan bazlı anonimleştirmeyi tanımlar.

Profile, hastanın genel kimlik ve tercih bağlamıdır. Tıbbi geçmiş, tedavi ihtiyacı, bütçe, dosya ve mesaj içeriği profile yazılmaz; ilgili inquiry/lead veya feature spec’inin veri sınırında tutulur.

## 2. Kapsam

### 2.1 Kapsam içinde

- Minimum patient profile: ad/soyad veya display name, ülke ve iletişim metadata’sı.
- Profile preference: BCP 47 language/locale ve ISO 4217 currency.
- ISO 3166-1 alpha-2 country standardı.
- Category + channel contact preferences.
- Private-by-default profile ve explicit share policy.
- Progressive completion ve self-service profile update.
- Provider identity alanlarının kontrollü/read-only sınırı.
- Field-level anonymization matrix.
- Profile update, preference update, share projection ve audit davranışı.

### 2.2 Kapsam dışında

- Tıbbi geçmiş, teşhis, tedavi planı veya sağlık özeti.
- Inquiry/lead iş akışı, klinik atama ve consent snapshot; SPEC-007.
- Dosya metadata/binary erişimi; SPEC-008.
- Notification delivery provider/retry/outbox; SPEC-011.
- Nihai retention, anonymization operasyonu ve hukuki saklama matrisi; SPEC-012.
- Public patient directory veya hasta profilinin keşifte yayınlanması.

## 3. Kabul edilmiş kararlar

| Karar | Accepted seçim | Sınır / not |
| --- | --- | --- |
| Profile boundary | Minimum profile | Ad/display name, country ve iletişim metadata’sı; health data profile’da yok |
| Preferences | Dil/locale, para birimi ve iletişim tercihleri ayrı preference modelinde | Profile identity alanlarıyla karıştırılmaz |
| Standards | ISO 3166-1 alpha-2, BCP 47, ISO 4217 | Unsupported değerler reddedilir |
| Contact prefs | Category + channel | In-app, email, push; delivery SPEC-011’de |
| Visibility | Private by default + explicit share | Public patient directory yok |
| Completion | Progressive completion + self-service | Inquiry için minimum alanlar feature contract’ında zorunlu olabilir |
| Ownership | Patient self-service | Provider identity alanları kontrollü/read-only; admin override policy ile audit edilir |
| Deletion | Field-level anonymization matrix | Legal/audit referansları korunabilir; exact field map implementation/SPEC-012’de |

## 4. Profile alan sınırı

### 4.1 Minimum profile alanları

Minimum `PatientProfile` aşağıdaki kavramsal alanları taşır:

- profile ID ve user identity reference
- display name veya ad/soyad alanları
- country: ISO 3166-1 alpha-2
- optional email/phone contact metadata; provider identity ile ayrıştırılmış ownership
- profile completion state
- created/updated timestamps
- soft-delete/anonymization state reference

Email/password, Google veya Apple provider identity’si profile alanı değildir. Provider’dan gelen email/display name ilk değer olabilir; kullanıcı profile ownership’i dışında otomatik overwrite yapılmaz.

Phone alanı varsa E.164 boundary validation uygulanır. Telefon OTP MVP’de yoktur; telefon alanı yalnızca iletişim metadata’sı ve preference policy’si kapsamında işlenir.

### 4.2 Profile’da tutulmayan veriler

Aşağıdaki veriler profile alanına eklenmez:

- teşhis, hastalık, ilaç, alerji veya tıbbi geçmiş
- tedavi ihtiyacı, beklenti, açıklama ve bütçe
- inquiry/lead durumu ve klinik atama
- dosya binary’si veya belge içeriği
- mesaj/revision içeriği
- teklif, randevu ve treatment journey state’i

Bu alanlar ilgili feature aggregate’inin sahipliğinde kalır. Profile response’ları geniş ilişki ağacı döndürmez.

## 5. Locale, dil ve para birimi

### 5.1 Standartlar

- Country `ISO 3166-1 alpha-2` kodudur.
- Language/locale `BCP 47` tag’idir.
- Currency `ISO 4217` kodudur.
- Kodlar case/format canonicalization boundary’sinden geçer.
- Unsupported country, language/locale veya currency değeri güvenli validation error üretir.
- Platform default locale, language ve currency deployment/config catalog’ında tanımlıdır; kullanıcı seçimi yoksa yalnız default uygulanır.

### 5.2 Preference ownership

- Kullanıcı kendi language/locale/currency preference’ını değiştirebilir.
- Currency preference fiyatların muhasebe para birimini değiştirmez; yalnız görüntüleme/formatlama tercihidir.
- Locale preference tarih, sayı ve lokalize metin formatlamasını etkileyebilir; server-side tarih storage UTC kalır.
- Klinik/organization kullanıcı tercihi hastanın preference’ını değiştiremez.
- Tercih değişiklikleri profile ownership ve audit policy’den geçer.

## 6. İletişim tercihleri

### 6.1 Category + channel modeli

`ContactPreference` her notification category için channel state taşır. MVP channel’ları:

- `in_app`
- `email`
- `push`

Category örnekleri feature spec’lerinde canonical catalog ile tanımlanır: account/security, inquiry/lead, message, quote, appointment, follow-up ve operational notice.

Kullanıcı category bazında channel’ı opt-in veya opt-out yapabilir. Security, account recovery ve hukuken zorunlu hesap mesajları preference ile tamamen kapatılamaz; zorunlu gönderim nedeni audit edilir.

### 6.2 Delivery sınırı

- SPEC-004 yalnız preference state ve ownership’i tanımlar.
- Provider send, retry, delivery attempt, bounce ve outbox davranışı SPEC-011’dedir.
- Kullanıcıya gönderilmeyen channel için delivery attempt oluşturulmaz.
- Preference update idempotent’tir; aynı state tekrarlandığında duplicate notification üretmez.

## 7. Görünürlük ve explicit share

### 7.1 Private default

Patient profile varsayılan olarak private’tır. Public discovery, organization directory veya anonymous response patient profile alanı döndürmez.

Profile alanları yalnız authenticated ve yetkili bir inquiry/lead context’inde, gerekli minimum projection olarak açılabilir. Erişim için:

1. Aktif authenticated actor.
2. Patient ownership veya açık paylaşım policy’si.
3. İlgili organization’ın active membership’i.
4. Inquiry/lead assignment veya share check’i.
5. SPEC-003 genel rıza durumu.
6. Alanın feature contract’ında paylaşılabilir olması.

### 7.2 Projection

- Kuruluş profile’ın tamamını değil, feature’ın izin verdiği alan projection’ını görür.
- Sağlık verisi profile’da bulunmadığından profile projection’ı sağlık özeti içermez.
- Public profile, search index veya discovery cache’e patient data yazılmaz.
- Explicit share geri çekildiğinde yeni profile read erişimi durur; daha önce yapılmış delivery/audit kayıtları sessizce silinmez.
- Recipient-specific consent snapshot SPEC-003 MVP kararına göre oluşturulmaz; erişim her istekte güncel policy ile hesaplanır.

## 8. Progressive completion ve self-service

### 8.1 Completion state

Profile tamamlanması tek bir global zorunlu form değildir. State aşağıdaki gibi hesaplanabilir:

- `empty`: identity mevcut, profile alanı yok
- `started`: en az bir minimum alan var
- `ready_for_inquiry`: ilgili inquiry contract’ının minimum alanları tamam
- `complete`: profile ve preference baseline alanları mevcut

Completion state client’ın gönderdiği boolean’a güvenmez; server-side alan ve validation sonucu hesaplanır.

### 8.2 Self-service update

- Patient yalnızca kendi profile ve preference alanlarını günceller.
- Provider identity, Firebase UID, email verification state ve system timestamps client tarafından değiştirilemez.
- Allowed field update partial olabilir; unknown field sessizce yok sayılmaz.
- Her değişiklik önceki/değişen alan metadata’sını ham hassas değerleri loglamadan audit eder.
- Admin düzeltmesi gerekiyorsa ayrı audited administrative action kullanılır; client ownership bypass edilmez.

## 9. Field-level anonymization

SPEC-003 soft delete/anonymization request başlattığında profile alanları sınıf bazında işlenir:

| Alan sınıfı | Örnek | Deletion davranışı |
| --- | --- | --- |
| Direct identity PII | Ad, soyad, display name, email, phone | Irreversible anonymization veya policy-defined redaction |
| Preference | Locale, language, currency, contact channel state | Silinir veya default/anonymous state’e çekilir |
| Provider reference | Firebase UID/provider identity reference | Credential/provider cleanup ile ayrıştırılır; raw secret tutulmaz |
| Audit reference | Actor ID, request ID, event timestamp | Legal/audit gereği pseudonymous reference olarak korunabilir |
| Feature ownership reference | Inquiry/lead/message bağlantısı | Feature retention ve legal policy’ye göre opaque/anonymized actor reference |

Exact field mapping, retention period ve legal exception listesi SPEC-012 ile aynı policy’den uygulanır. Profile deletion hiçbir feature’ın audit invariant’ını bozamaz.

## 10. API işlem grupları

Exact endpoint route adları implementation kaydında sabitlenmek üzere aşağıdaki davranış grupları zorunludur:

| İşlem | Aktör | Beklenen sonuç | Durum |
| --- | --- | --- | --- |
| Kendi profile’ını getir | Patient | Minimum profile + completion state | Accepted |
| Kendi profile’ını güncelle | Patient | Validated profile + audit reference | Accepted |
| Kendi preferences’ını getir/güncelle | Patient | Locale/currency/contact preference state | Accepted |
| Yetkili profile projection’ı getir | Assigned organization actor | Minimum allowed fields | Accepted boundary |
| Explicit share state’i getir/güncelle | Patient veya feature-authorized use-case | Share policy sonucu + audit | Accepted boundary |
| Profile deletion/anonymization durumunu getir | Patient/admin policy | Request state; private data açmadan | Accepted boundary |

Tüm işlemler `/api/v1` ve SPEC-002 RFC 9457 JSON Problem Details sözleşmesini kullanır. Profile read/update auth, ownership, membership, assignment/share ve field policy kontrollerinden geçer.

## 11. Veri modeli

| Entity | Sorumluluk | Ana invariant |
| --- | --- | --- |
| `PatientProfile` | Minimum identity profile | Patient identity’ye tek profile; health data içermez |
| `PatientPreference` | Language/locale/currency | ISO/BCP 47/ISO 4217 validation’dan geçer |
| `ContactPreference` | Category + channel state | Security/account zorunlu mesaj policy’si override edemez |
| `ProfileSharePolicy` | Explicit share ve visibility state | Default private; public discovery’ye yazılmaz |
| `ProfileAuditEvent` | Profile/preference/share changes | Raw secret veya gereksiz PII loglamaz |
| `ProfileAnonymizationRecord` | Field-level deletion result | State, policy version ve audit reference taşır |

## 12. Validation, conflict ve transaction kuralları

- Profile, preference ve share update body’leri ayrı Zod boundary schema’larıyla doğrulanır.
- Country/language/locale/currency allowlist ve canonicalization aynı boundary’de uygulanır.
- Name/display name length, Unicode/control character, whitespace ve normalization kuralları tanımlıdır.
- Email/phone contact metadata provider identity ile karıştırılmaz; phone varsa E.164 doğrulanır.
- Aynı idempotency key ve payload duplicate side effect üretmez; farklı payload `409` üretir.
- Concurrent profile update stale version/ETag policy’sine göre `409` üretir veya güvenli field merge uygular; implementation kaydında tek strateji seçilir.
- Preference update ve audit reference güvenilir transaction/outbox sonucunda tamamlanır.
- Share policy değişikliği gelecekteki read authorization’ı etkiler; geçmiş delivery/audit kaydı silinmez.
- Profile anonymization partial failure durumunda sessiz başarı dönmez; recovery state ve audit üretir.

## 13. Audit, log ve privacy

Audit edilmesi gerekenler:

- profile create/update ve admin correction
- language/locale/currency preference değişikliği
- contact preference değişikliği
- explicit share enable/disable
- profile projection access gerektiğinde sensitive access audit’i
- deletion/anonymization field result
- validation veya authorization failure için güvenli security event referansı

Teknik loglar ad, email, telefon, health data, message, document, raw provider token veya tam profile payload taşımaz. Log correlation için request ID, pseudonymous actor reference, organization ID, endpoint template, status ve error code kullanılabilir.

## 14. Kabul kriterleri

1. Patient profile minimum identity alanlarıyla sınırlıdır; health data profile’a eklenmez.
2. Dil/locale/currency profile identity’den ayrı preference modelinde tanımlıdır.
3. Country ISO 3166-1 alpha-2, locale/language BCP 47 ve currency ISO 4217 olarak doğrulanır.
4. Unsupported locale/country/currency değerleri güvenli validation error üretir.
5. Contact preferences category + channel modelini ve in-app/email/push channel’larını tanımlar.
6. Security/account recovery mesajlarının kullanıcı preference’ı ile tamamen bastırılamayacağı yazılıdır.
7. Patient profile private by default’tır; public discovery veya directory response’larına girmez.
8. Profile projection yalnız authenticated + membership + assignment/share + consent policy sonucunda açılır.
9. Recipient-specific consent snapshot oluşturulmaz; güncel policy ile erişim hesaplanır.
10. Progressive completion state server-side hesaplanır.
11. Patient kendi profile/preferences alanlarını self-service güncelleyebilir.
12. Provider identity ve system-managed alanlar client tarafından değiştirilemez.
13. Profile update, preference update ve share update audit gerektirir.
14. Field-level anonymization matrix direct PII, preference, provider reference, audit reference ve feature ownership alanlarını ayırır.
15. Account deletion profile audit ve feature ownership invariant’larını bozmaz.
16. Profile API işlemleri `/api/v1`, RFC 9457, idempotency ve conflict kurallarına uyar.
17. Raw profile payload, health data, message, document veya provider secret teknik loga yazılmaz.
18. Bu spec uygulama kodu, schema, migration, notification provider veya retention’ın hukuki nihai kararını içermez.

## 15. Bağımlılıklar

- SPEC-002: Node/Nest/Fastify/Prisma, Zod, RFC 9457, audit/log/redaction ve idempotency foundation.
- SPEC-003: Firebase identity, device session, general consent, ownership, membership ve account deletion boundary.
- SPEC-005: Organization/clinic/doctor public profile ve organization access modeli.
- SPEC-007: Inquiry/lead minimum profile fields, share policy ve lead access.
- SPEC-008: File ownership ve profile dışı document metadata.
- SPEC-011: Contact preference category catalog, delivery/outbox/retry ve channel provider.
- SPEC-012: Retention, anonymization field matrix, legal exception ve audit operasyonu.

## 16. Implementation kayıtları

SPEC-004 product kararları kapatılmıştır. Implementation’da şu kayıtlar ayrıca tutulur:

1. Supported country/language/locale/currency catalog ve platform defaults.
2. Minimum `ready_for_inquiry` field seti ve validation limits.
3. Exact endpoint names, response projection ve optimistic concurrency/ETag stratejisi.
4. Notification category catalog ve security/account mandatory-message policy mapping’i.
5. Field-level anonymization matrix’in SPEC-012 retention/legal policy ile son eşlemesi.

## 17. Doğrulama planı

Implementation yapıldığında şu gerçek senaryolarla doğrulanmalıdır:

1. Hasta yalnız minimum profile alanlarını günceller; health data alanı profile mutation’da reddedilir.
2. Geçerli ISO country, BCP 47 locale ve ISO currency kabul edilir; unsupported değer reddedilir.
3. Profile tamamlanmamışken public discovery çalışır; inquiry minimum alanlar tamamlanmadan başlatılamaz.
4. Patient profile private kalır; public discovery ve başka kuruluş response’unda görünmez.
5. Active membership + assignment/share + consent olmadan organization profile projection’ı reddedilir.
6. Share geri çekildikten sonra yeni profile read erişimi kapanır; geçmiş audit/delivery kaydı korunur.
7. Contact category/channel update duplicate notification veya duplicate preference row üretmez.
8. Provider identity alanını client değiştiremez; admin correction audit edilir.
9. Concurrent profile update stale policy’ye göre güvenli conflict üretir veya tanımlı merge davranışını uygular.
10. Deletion/anonymization direct PII’yi matrix’e göre işler; audit/legal reference invariant’ları korunur.
11. Profile ve preference değişikliklerinde raw PII teknik loglara yazılmaz.
