# Backend API Context

Bu belge mobil uygulama ve gelecekteki web panellerinin backend’den bekleyeceği sözleşme sınırlarını tanımlar. Endpoint yolları, request/response envelope’ları ve alan adları kesinleşmemiştir; ilgili feature spec’inde netleşecektir.

## Sözleşme ilkeleri

- API tüketicileri: hasta mobil/web istemcisi, hastane/klinik paneli ve süper admin paneli. Concierge yüzeyi mevcut MVP’de yoktur.
- **Proposed:** Sürümlemeli HTTP API (`/api/v1/...`) ve mesaj/durum olayları için gerçek zamanlı kanal.
- Kimlik doğrulama ile kaynak yetkilendirmesi ayrı kontrollerdir.
- Her mutasyon input validation, auth, ownership/organization, izinli durum geçişi ve audit gereksinimini değerlendirmelidir.
- Sağlık verisi ve dosya metadata’sı response’lara “ihtiyaç kadar” eklenmelidir; geniş ilişki ağaçları varsayılan olarak dönmemelidir.
- İlgili feature spec’i onaylanmadan aşağıdaki gruplar implementasyon sözleşmesi değildir.

## API işlem grupları

### 1. Kimlik ve hesap

| İşlem amacı | Aktör | Bilinen girdi | Beklenen çıktı | Durum |
| --- | --- | --- | --- | --- |
| Firebase auth sonucu doğrula | Patient, organization actor, super admin | Firebase ID token; provider context | Actor context veya RFC 9457 `401` | **Accepted boundary** |
| Google/Apple ile giriş | Hasta | Firebase client/provider sonucu | Authenticated identity ve profile completion durumu | **Accepted** |
| Email/password ile giriş | Hasta | Firebase client/password sonucu | Authenticated identity ve email verification durumu | **Accepted** |
| Oturumu/cihazı sonlandır | Tüm giriş yapan aktörler | Device/session ID | Session revoke sonucu | **Accepted boundary** |
| Profil oku/güncelle | Patient veya yetkili actor | Minimum profile: name/display name, country, contact metadata | Güncel profile + completion state | **Accepted boundary; SPEC-004** |
| Preferences oku/güncelle | Patient | BCP 47 locale/language, ISO 4217 currency, category/channel contact preferences | Güncel preference state | **Accepted boundary; SPEC-004/011** |
| Yetkili profile projection’ı getir | Assigned organization actor | Inquiry/lead context, field policy | Minimum allowed profile fields | **Accepted boundary; SPEC-004/007** |
| Genel rıza kabul/geri çek | Hasta | Consent version/status | Consent record ve audit sonucu | **Accepted; detay SPEC-007/012** |
| Hesap silme talebi | Hasta | Yeniden doğrulama ve sebep opsiyonu | Soft-delete/anonymization request durumu | **Accepted boundary; retention SPEC-012** |

**Auth gereksinimi:** Public discovery anonymous olabilir. Inquiry, dosya, mesaj, teklif, randevu, profile, consent ve deletion işlemleri authenticated context ister. Firebase token validation cache’i en fazla 15 dakika olabilir; membership, ownership, assignment/share ve consent kontrollerini atlamaz. Rate limit, brute-force, reset expiration/replay ve audit kuralları SPEC-003’te zorunludur.

### 2. Klinik, doktor, tedavi ve doğrulama dizini

| İşlem amacı | Aktör | Bilinen girdi | Beklenen çıktı | Durum |
| --- | --- | --- | --- | --- |
| Tedavi/kategori listele ve ara | Ziyaretçi veya hasta | Normalized query, allowlisted category/locale filters, cursor | Published + verified + active + public-safe cursor page | **Accepted; SPEC-006** |
| Organization listele/filtrele | Ziyaretçi veya hasta | Normalized query; country/city/treatment/language allowlist; cursor | Published + verified + active + public-safe cursor page | **Accepted; SPEC-006** |
| Organization/doktor detayını getir | Ziyaretçi veya hasta | Public UUID | Published + verified + active + public-safe detail veya güvenli `404` | **Accepted; SPEC-006** |
| Organization/location profilini yönet | Owner/admin/editor policy | Yetkili draft/location alanları | Draft/profile state + audit | **Accepted boundary; SPEC-005** |
| Verification/publication incele | Süper admin | Organization/doctor evidence, karar, gerekçe, expiry | Verification/publication state + audit reference | **Accepted boundary; SPEC-005** |

**Kaynak erişimi:** Organization actor yalnız active membership + owner/admin/editor capability ile bağlı organization draft/location/treatment link alanlarını yönetir; verification/publication kararı yalnız super admin’e aittir.

### 3. Concierge — mevcut MVP dışında

Concierge dizini, sağlayıcı hesabı, teklif ve rezervasyon API’leri **Deprecated / mevcut MVP kapsamı dışındadır**. Ayrı bir gelecek feature spec’i kabul edilmeden endpoint tasarlanmaz.

### 4. Tedavi talebi / lead

| İşlem amacı | Aktör | Bilinen girdi | Beklenen çıktı | Durum |
| --- | --- | --- | --- | --- |
| Talep oluştur/submit et | Hasta | Structured intake, 1–3 eligible organization, explicit grant, idempotency key | Inquiry + organization-specific Lead/Assignment + timeline | **Accepted; SPEC-007** |
| Kendi taleplerini listele/getir | Hasta | Allowlisted durum/tedavi/tarih filtreleri, cursor | Private Inquiry/Lead projection | **Accepted; SPEC-007** |
| Kuruluş leadlerini listele/getir | Active organization member | Assignment, durum, tarih filtreleri, cursor | Yalnız own-assignment + current-grant projection | **Accepted; SPEC-007** |
| Assignment accept/decline veya revoke/reassign | Organization actor / super admin | Lead, target, reason, expected version | Versioned assignment + timeline/audit | **Accepted; SPEC-007** |
| Lead durumunu ilerlet | Yetkili organization actor / patient / super admin policy | Hedef durum, expected version, bounded note | Güncel durum + append-only timeline event | **Accepted; SPEC-007** |
| Lead sonucu bildir | Hasta ve organization | Follow-up cycle, `YES`/`NO`, bounded note | Outcome declaration + conflict/review state | **Accepted; SPEC-007** |

**Kaynak erişimi:** Hasta yalnızca kendi leadlerini; klinik yalnızca kuruluşuna atanmış ve paylaşım izni olan leadleri görür. Süper admin bütün lead, konuşma ve message revision kayıtlarını her zaman görebilir; erişim audit edilir.

### 5. Mesajlaşma

| İşlem amacı | Aktör | Bilinen girdi | Beklenen çıktı | Durum |
| --- | --- | --- | --- | --- |
| Konuşmaları listele | Hasta/klinik temsilcisi; süper admin | Cursor, lead, kuruluş, unread filtresi | Katılımcıya kendi konuşmaları; süper admine tüm konuşmalar | **Accepted ihtiyaç; Proposed sözleşme** |
| Mesaj geçmişini getir | Konuşma katılımcısı veya süper admin | Conversation ID, cursor | Katılımcıya yalnız güncel mesajlar ve `edited`; süper admine revision özeti/detayı | **Accepted** |
| Mesaj gönder | Konuşma katılımcısı | Metin ve/veya attachment referansı; client request ID | Kalıcı message ID, server zamanı, denetim durumu | **Accepted** |
| Mesaj düzenle | Mesaj sahibi | Message ID, yeni içerik, beklenen revision | Yeni revision ve güncel mesaj | **Accepted; zaman sınırı Unknown** |
| Revision geçmişini getir | Yalnız süper admin | Message ID veya conversation ID, cursor | Eski/yeni içerik, düzenleyen aktör, zaman, revision sırası ve güvenli origin metadata | **Accepted** |
| Mesaj sil | — | — | Silme endpoint’i yoktur | **Rejected** |
| Şikâyet veya destek kaydı aç | Konuşma katılımcısı | Conversation/message/lead, tür, kategori, açıklama | Case ID ve ilk durum | **Accepted** |
| Mesaj/dosya gerçek zamanlı olayı | Katılımcı | Yetkili socket/session | Yeni/değişmiş mesaj olayı; eski revision içeriği yok | **Proposed WebSocket** |

**Görünürlük:** Hasta ve klinik temsilcisi eski revision içeriğini hiçbir response/event içinde alamaz. Yalnız güncel içerik, `edited = true`, güncel revision numarası ve son düzenleme zamanı gösterilebilir. Süper admin bütün revision’ları her zaman görebilir; erişim audit edilir.

**Çakışma:** Düzenleme stale revision’a karşı yapılırsa `409 Conflict` adayıdır. Aynı client request ID ile tekrarlanan gönderim yeni mesaj üretmemelidir (**Proposed idempotency**).

### 6. Dosya yükleme ve indirme

| İşlem amacı | Aktör | Bilinen girdi | Beklenen çıktı | Durum |
| --- | --- | --- | --- | --- |
| Upload başlat | Hasta/klinik temsilcisi | Dosya adı, MIME, boyut, kullanım bağlamı | Upload yetkisi veya URL, attachment ID | **Proposed** |
| Upload tamamla | Yükleyen aktör | Attachment ID, checksum/metadata | İşleme/tarama durumu | **Proposed** |
| Dosya metadata’sını getir | Yetkili aktör | Attachment ID | Metadata ve durum | **Proposed** |
| Dosya indir | Yetkili aktör | Attachment ID | Kısa ömürlü erişim veya stream | **Proposed** |

**Güvenlik:** Public kalıcı URL olmamalı. İndirme anında hasta sahipliği, lead/organization ataması, paylaşım izni ve dosya durumu yeniden doğrulanmalı. Boyut/MIME/checksum/malware kuralları **Unknown**.

### 7. Teklif

| İşlem amacı | Aktör | Bilinen girdi | Beklenen çıktı | Durum |
| --- | --- | --- | --- | --- |
| Teklif taslağı oluştur/güncelle | Klinik temsilcisi | Lead, tutar, para birimi, kalemler, dahil/hariç, geçerlilik | Taslak teklif | **Proposed** |
| Teklifi yayımla | Klinik temsilcisi | Quote ID, beklenen sürüm | Gönderilmiş teklif ve zaman | **Proposed** |
| Teklifleri listele/detay | Hasta/klinik | Lead ve durum | Yetkili teklifler | **Proposed** |
| Teklifi kabul et | Hasta | Quote ID, expected version, idempotency key adayı | Kabul sonucu ve güncel lead durumu | **Proposed** |
| Teklifi reddet | Hasta | Quote ID, opsiyonel sebep | Red sonucu | **Proposed** |

**Çakışma:** Süresi dolmuş, geri çekilmiş veya başka teklif kabul edilmişse `409 Conflict` adayı. Tutar representation’ı minor unit/decimal + ISO 4217 olmalı (**Proposed**).

### 8. Randevu ve süreç zaman çizelgesi

| İşlem amacı | Aktör | Bilinen girdi | Beklenen çıktı | Durum |
| --- | --- | --- | --- | --- |
| Randevu talep/oluştur | Hasta veya klinik **Unknown** | Lead, doktor opsiyonu, zaman, saat dilimi, görüşme türü | Randevu durumu | **Proposed** |
| Randevu onayla/yeniden planla/iptal et | Yetkili taraf | Appointment ID, yeni zaman/sebep, expected version | Güncel randevu | **Proposed** |
| Süreç zaman çizelgesini getir | Hasta/klinik/admin | Lead ID | Sıralı durum olayları | **Proposed** |
| İzinli süreç geçişi yap | Yetkili aktör | Hedef durum, not, expected version | Yeni event + güncel aggregate | **Proposed** |

**Tarih/saat:** API RFC 3339 timestamp ve açık IANA time zone almalı/döndürmeli (**Proposed**); yalnız UTC offset randevu bağlamını korumak için yeterli değildir.

### 9. Lead follow-up, deterministik denetim ve admin incelemesi

| İşlem amacı | Aktör | Bilinen girdi | Beklenen çıktı | Durum |
| --- | --- | --- | --- | --- |
| Follow-up üret | Internal job/admin | 7 gün meaningful inactivity, iki hedef taraf | Tek açık idempotent follow-up cycle | **Accepted; delivery SPEC-011** |
| Follow-up yanıtla | Hasta/klinik | Follow-up ID, `YES` veya `NO`, opsiyonel kısa not | Sonuç beyanı ve conflict durumu | **Accepted** |
| Denetim kurallarını yönet | Süper admin | Anahtar kelime/pattern, kategori, aktiflik, sürüm | Sürümlü screening rule | **Accepted davranış; API biçimi Proposed** |
| Mesajı deterministik tara | Internal service | Message/revision ID, rule version | Eşleşme listesi veya temiz sonuç | **Accepted** |
| Risk flaglerini listele | Süper admin | Durum, kural, kuruluş, tarih, cursor | Flag özeti | **Accepted** |
| Flag ve konuşma detayını aç | Süper admin | Flag/conversation ID | Güncel mesajlar ve tüm revision’lar | **Accepted; erişim audit edilir** |
| Flag kararını kaydet | Süper admin | Karar, gerekçe, aksiyon | Güncel flag ve audit event | **Accepted** |
| Seçilen kuruluşa denetim bildirimi gönder | Süper admin | Flag/case ID, organization ID, `sendNotice: YES/NO`, güvenli açıklama | Notice/delivery durumu | **Accepted** |

Denetim pipeline’ı AI/model çağırmaz. En az Unicode normalizasyonu, case folding, Unicode rakamlarını ortak forma çevirme, ayırıcıları normalize etme, bitişik/ayrık rakam dizilerini tanıma ve sayıları yazıyla/heceleyerek verme biçimlerine karşı sürümlü kurallar içerir. Orijinal mesaj değiştirilmez; tarama ayrı normalize edilmiş görünüm üzerinde çalışır.

Flag mesajı silmez. Otomatik engelleme/bekletme kararı bu spec’te yoktur; mesaj kaydedilir, flag admin kuyruğuna düşer.

### 10. Admin, şikâyet/destek, audit ve operasyon

| İşlem amacı | Aktör | Bilinen girdi | Beklenen çıktı | Durum |
| --- | --- | --- | --- | --- |
| Şikâyet/destek kayıtlarını listele | Süper admin | Tür, durum, kuruluş, tarih, cursor | Case özetleri | **Accepted** |
| Şikâyet/destek detayını aç | Süper admin | Case ID | İlişkili lead/conversation/message ve tüm revision’lar | **Accepted** |
| Case durumu/çözümünü güncelle | Süper admin | Hedef durum, çözüm notu, expected version | Güncel case + audit event | **Accepted** |
| Kuruluş/kullanıcı kısıtla | Süper admin | Hedef, aksiyon, gerekçe, expected version | Yeni durum + audit | **Proposed** |
| Audit geçmişini listele | Süper admin | Aktör, hedef, eylem, kuruluş, tarih, cursor | Audit olayları | **Accepted** |
| Kuruluş bildirim teslimini getir/yeniden dene | Süper admin | Notice ID | Teslim durumu/attempt listesi | **Accepted ihtiyaç; retry teknolojisi Unknown** |
| Mobil hata raporu al | Mobil uygulama | Seviye, güvenli mesaj/kod, ekran, platform, app version, request ID | Kabul/ret sonucu | **Proposed** |

Audit kaydı revision içeriğini tekrar kopyalamak yerine message/revision referansı taşır. Süper admin revision içeriğini yetkili revision endpoint’inden görür. Teknik log API’si kullanıcı üretimli sınırsız metni merkezi loga aktarmamalıdır.

- **Accepted:** Google, Apple ve email/password Firebase Authentication; telefon OTP ve 2FA MVP dışıdır.
- **Accepted:** Backend Firebase token validation yapar; validation sonucu en fazla 15 dakika cache’lenebilir; device session boundary ayrıca tutulur.
- **Accepted:** Public discovery anonymous olabilir; inquiry ve protected product operations authentication ister.
- **Accepted:** Tek genel rıza, active organization membership, assignment/share ve ownership authorization policy’nin parçalarıdır.
- Token payload’ı tek başına güncel kuruluş üyeliği veya hassas kaynak erişimi için yeterli sayılmamalıdır.
- Authorization policy actor role/capability, active membership, ownership/assignment/share, consent and aggregate state kontrollerini birlikte uygular.

### Her istekte gerekli authorization boyutları

1. Aktif kimlik ve session.
2. Gerekli rol/capability.
3. Aktif organization membership.
4. Kaynak sahibi/atanan kuruluş/katılımcı ilişkisi.
5. Hasta paylaşım izni ve veri alanı kapsamı.
6. Aggregate durumu ve izinli state transition.
7. Süper admin mi? Süper admin bütün konuşma/revision kayıtlarına erişebilir; her erişim ve admin aksiyonu audit edilir.

## Validation beklentileri

- Tüm body/query/path/header/event girdileri güvenilmez kabul edilir.
- Bilinmeyen alanlar, coercion ve boş/null semantiği feature spec’inde açık olmalıdır.
- Enum değerleri serbest metin değil, sözleşmeli değerler olmalıdır.
- Metin, dosya, liste ve pagination boyutlarına üst sınır konmalıdır.
- Mesajın orijinal içeriği saklanır; denetim için ayrı, deterministik normalize edilmiş görünüm üretilir.
- Denetim normalizasyonu Unicode rakamları, case, whitespace/ayırıcılar ve yazıyla/hecelenmiş sayı token’ları için sürümlü ve tekrar üretilebilir olmalıdır.
- Cross-field kurallar yalnız DTO şemasıyla değil iş katmanında doğrulanır.
- Harici callback/webhook girdileri şema + imza + replay kontrolünden geçer.
- Validation hatası alan bazlı ve istemci tarafından işlenebilir olmalı; hassas internals döndürmemelidir.

Response envelope ve hata catalog’ı SPEC-002’de kabul edilen RFC 9457 JSON Problem Details sözleşmesini kullanır. Feature spec’leri yalnız domain-specific `type`/`code`, field error ve resource ayrıntılarını ekler.

HTTP status mapping RFC 9457 catalog ile uygulanır; aşağıdaki durum sınıfları feature contract’larında korunur:

| Durum | Anlam | Örnek |
| --- | --- | --- |
| `200/201/204` | Başarılı okuma/oluşturma/no-content | Talep oluşturuldu, teklif kabul edildi |
| `400` | Biçimsel olarak geçersiz istek | Parse edilemeyen tarih |
| `401` | Geçerli kimlik/oturum yok | Süresi dolmuş session |
| `403` | Kimlik var, kaynak/aksiyon yetkisi yok | Başka kliniğin lead’i |
| `404` | Kaynak bulunamadı veya güvenlik için görünmez | Yetkisiz kaynağı gizleme |
| `409` | Sürüm/durum/idempotency çakışması | Süresi dolmuş teklifi kabul, stale revision |
| `413/415` | Dosya çok büyük / tür desteklenmiyor | Upload |
| `422` | Şema geçse de iş kuralı ihlali | İzin verilmeyen durum geçişi |
| `429` | Rate limit | Auth, password reset, invite veya mobile-log kötüye kullanımı |
| `5xx` | Beklenmeyen/bağımlılık hatası | Güvenli error ID ile; internals yok |

Domain-specific error code catalog’ları ilgili feature spec’te; shared RFC 9457 field mapping ve retry sınıflandırması SPEC-002 foundation sözleşmesine uyar.

## Listeleme, filtreleme ve pagination

- Organization, doctor ve treatment discovery PostgreSQL-first search kullanır; harici search/vector/AI yoktur.
- Public discovery cursor pagination kullanır: default `20`, maximum `50`.
- Her liste deterministic relevance ve stable UUID tie-breaker kullanır.
- Filtreler endpoint bazında allowlist’tir; ham SQL/ORM filter veya sort expression alınmaz.
- Text search Unicode normalization, locale-aware case folding ve accent-insensitive matching uygular; BCP 47 fallback deterministic’tir.
- Empty discovery result `200` + empty page; invalid cursor RFC 9457 validation error üretir.
- Patient organization, doctor ve treatment favorites state’ini private/idempotent olarak yönetir; favorites public ranking’i etkilemez.

## Veri temsili

| Konu | Durum / kural |
| --- | --- |
| ID | UUID foundation baseline; dış API’de opaque string representation |
| Tarih/saat | **Proposed:** RFC 3339; DB’de UTC; randevuda IANA time zone ayrıca |
| Enum | **Proposed:** Sözleşmeli string enum; istemci bilmediği değerde güvenli fallback yapmalı |
| Para | **Proposed:** Integer minor unit veya exact decimal + ISO 4217; float yok |
| Locale/dil | BCP 47; supported catalog ve exact/base/default fallback |
| Ülke | ISO 3166-1 alpha-2 |
| Telefon | **Proposed:** E.164 normalize edilmiş değer; görüntü formatı ayrı |
| Boolean/null | Her alanın “yok”, “bilinmiyor”, `false` anlamı spec’te açık olmalı |
| Versiyonlama | `/api/v1` foundation; event/schema compatibility feature contract’ında |

## Dosya gereksinimleri

- Kullanım bağlamları: tedavi talebi sağlık belgesi/fotoğrafı, mesaj eki, kuruluş doğrulama belgesi, olası yorum fotoğrafı.
- Binary veri metadata’dan ayrılmalı; private object storage **Proposed**.
- Yetkili pre-signed upload/download veya backend stream **Proposed**.
- Checksum, resumable upload, chunking, malware scan, quarantine, EXIF temizleme, preview ve retention **Unknown**.
- Dosya ID’si başka talep/konuşmaya bağlanırken yükleyici sahipliği ve bağlam yetkisi yeniden doğrulanmalı.
- Sağlık belgesinin URL’si veya içeriği teknik log veya analytics’e yazılmamalıdır. Mevcut MVP’de AI prompt’u yoktur.

## Tekrar istek, idempotency ve eşzamanlılık

- Talep oluşturma, mesaj gönderme, mesaj düzenleme, follow-up yanıtı, kuruluş bildirimi, teklif kabulü ve webhook işlemleri retry ile duplicate üretmemelidir.
- **Proposed:** İstemci tarafından üretilen idempotency key/request ID + server tarafında scope’lu sonuç saklama.
- Mesaj revision, case, kuruluş bildirimi, teklif, randevu ve lead geçişlerinde optimistic concurrency/version kontrolü **Proposed**.
- Mesajın güncel sürümünü değiştirme ile revision ve audit kaydı tek transaction içinde olmalıdır.
- Kuruluş bildirimi aynı flag/case + organization + karar için duplicate bildirim üretmemelidir.
- Background job tüketicileri en az bir kez teslimi varsayıp idempotent çalışmalıdır.
- WebSocket yeniden bağlanınca cursor/sequence üzerinden kaçırılan olayları tamamlama davranışı **Unknown**.

## API tasarımındaki açık sorular

1. REST, RPC veya hibrit sözleşme; endpoint naming ve response envelope.
2. Auth kanalları, session/token modeli ve anonim keşif sınırı.
3. Lead’in tek kliniğe mi çok kliniğe mi dağıtılacağı.
4. Mesaj düzenleme zaman penceresi, maksimum revision sayısı ve mesaj/revision/audit retention süresi.
5. Deterministik denetimin ilk dil/alfabe kapsamı ve başlangıç rule set’i.
6. Follow-up hareketsizlik süresi, hedef taraflar, kanal ve tekrar sayısı.
7. Kuruluş denetim bildiriminin uygulama içi, e-posta veya başka hangi kanaldan teslim edileceği.
8. Kesin lead/quote/appointment durum makineleri ve geçiş sahipleri.
9. Dosya allowlist/limit/tarama/retention ve veri yerleşimi.
10. Para/ödeme/komisyon davranışının MVP’de bulunup bulunmadığı.
