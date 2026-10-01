# Backend Code Standards

Foundation stack artık Accepted: Node 22 LTS + TypeScript, pnpm 10, NestJS 11/Fastify 5, PostgreSQL + Prisma 6, UUID ve Zod boundary validation. Aşağıdaki kurallar framework bağımsızdır; patch sürümleri ve repository iskeleti implementation’da sabitlenir.

## Genel ilkeler

- Bir değişiklik tek bir anlamlı backend birimini çözmeli; ilgisiz refactor veya feature eklememeli.
- Kök nedeni düzelt; semptomu gizleyen özel durumlar veya sessiz fallback ekleme.
- Ürün davranışını ilgili feature spec belirler. Context belgeleri kapsamı ve değişmezleri, spec ise uygulanacak ayrıntıyı tanımlar.
- Kabul edilmemiş **Proposed** veya **Unknown** davranışı kodlama.
- İş kuralları transport, framework decorator’ları ve ORM ayrıntısından mümkün olduğunca bağımsız tutulmalı.
- Kullanıcı kaynaklı sağlık verisini, mesajı ve belgeyi minimum gerekli kapsam dışında kopyalama.
- Ölçülmemiş performans için cache, queue, mikroservis veya denormalizasyon ekleme.

## Dosya ve modül organizasyonu

### Framework bağımsız sınırlar

Her iş modülü, seçilen framework’ün idiom’una uyarlanarak şu sorumlulukları ayırmalıdır:

- **Transport/API:** HTTP/WebSocket/event girişini parse eder, auth context’i alır, use-case çağırır, sonucu sözleşmeye çevirir.
- **Application/use-case:** Yetki, durum geçişi, orchestration ve transaction sınırını yönetir.
- **Domain/policy:** Framework ve DB’den bağımsız iş kuralları; izinli geçişler, kararlar ve invariant’lar.
- **Data access:** Sorgu ve persistence ayrıntıları; tenant/organization scope’unu görünür kılar.
- **Integration:** Object storage, OTP, bildirim, AI, log sink gibi dış servis adapter’ları.
- **Jobs:** Retry edilebilir, idempotent background iş girişleri.

**Proposed NestJS düzeni:** Feature-first modüller (`identity`, `providers`, `leads`, `messaging`, `quotes`, `appointments`, `risk-review`, `files`, `audit`) ve her modül içinde controller/gateway, application service, policy ve repository adapter. Katmanları sırf mimari görünmek için klasörle çoğaltma; gerçek bağımlılık sınırı yoksa düz tut.

### Bağımlılık yönü

- Transport → application → domain/policy.
- Data/integration adapter’ları application tarafından interface üzerinden çağrılabilir; domain framework/ORM/client import etmez.
- Modüller başka modülün tablosuna doğrudan yazmaz; ilgili use-case/policy üzerinden davranış çağırır.
- Shared klasörü ürün davranışlarının döküldüğü genel bir çöp kutusu olamaz; yalnız gerçek, kararlı çapraz kesen primitive’ler bulunur.

## İsimlendirme

- İş terimleri belgeler ve kod arasında tutarlı olmalı. `Inquiry`, `Lead`, `Request` üçlüsünden biri feature spec’inde seçildiğinde her yerde aynı kavram kullanılmalı.
- Type/class adları `PascalCase`; fonksiyon/değişkenler `camelCase`; sabitler proje formatter/linter konvansiyonuna göre.
- Boolean’lar `is`, `has`, `can`, `should` ile anlamını açıklar.
- Command/use-case adları davranış belirtir: `CreateTreatmentInquiry`, `AcceptQuote`; belirsiz `Manager`, `Helper`, `Utils` adlarından kaçın.
- DB ve API enum değerleri semantik, kararlı string değerler olmalı; görüntü metni enum’a gömülmemeli.
- ID değişkenleri türü açık eder: `leadId`, `organizationId`; çıplak `id` yalnız çok dar bağlamda.
- Zaman alanları `...At`, tarih alanları `...On`; time zone alanı açık isimlendirilir.

## Tip güvenliği

- TypeScript `strict` modu **Proposed standart**; `any` kullanılmamalı.
- Dış sistem girdisi `unknown` olarak başlar ve doğrulanmadan domain tipine dönüşmez.
- DB record, API DTO ve domain nesnesi aynı tipmiş gibi kullanılmamalı; her sınırın görünür dönüştürmesi olmalı.
- Para, ID, locale, telefon ve timestamp için yanlış primitive kullanımını azaltan branded/value object yaklaşımı yalnız anlamlı hata sınıfını önlüyorsa kullanılır.
- Nullable/optional alanlar farklı anlam taşıyorsa tipte ayrıştırılır; `undefined`, `null`, boş string rastgele eşdeğer sayılmaz.
- Exhaustive enum/state handling gerekir; bilinmeyen harici değer güvenli biçimde reddedilir veya fallback’e gider.
- Type assertion ve non-null assertion ancak invariant kodla kanıtlandığında, dar kapsamda kullanılmalı.

## Girdi doğrulama

- Path, query, header, body, WebSocket event, job payload, environment variable ve harici webhook ayrı boundary şemalarıyla doğrulanır.
- Sadece tip/format değil; uzunluk, liste boyutu, sayı aralığı, MIME/byte size ve cross-field kuralları da doğrulanır.
- Normalize etme ile doğrulama ayrıdır. Örneğin telefon E.164’e normalize edilir, sonra doğrulanır.
- Unknown alan politikası endpoint bazında tutarlı olmalı; hassas mutasyonlarda ekstra alanları sessizce kabul etme.
- Validation şeması yalnız transport gereğini kapsar; authorization ve state transition application/domain katmanında kalır.
- Hata çıktısı alan/kod bazlı olmalı; raw provider/ORM/framework hatası istemciye dönmemeli.
- **Accepted teknoloji:** Zod boundary validation; authorization ve state transition application/domain katmanında kalır.

## Route/controller, iş mantığı ve veri erişimi

### Route/controller/gateway

- Request’i parse/validate eder.
- Authentication context’i çözer.
- Tek application use-case çağrısını koordine eder.
- HTTP/WebSocket sonucu ve güvenli hata eşlemesini yapar.
- İş kuralı, ORM sorgusu, transaction zinciri veya provider SDK akışı taşımaz.

### Application/use-case

- Kaynak erişim politikasını çağırır.
- Gerekli kayıtları yükler.
- Domain invariant ve durum geçişini uygular.
- Transaction sınırını tanımlar.
- Audit/outbox/job üretimini aynı iş sonucu içinde güvenilir kılar.
- Dış provider sonucunu domain hatasına çevirir.

### Veri erişimi

- Organization/ownership scope’u sorguda açık olmalı; sonradan filtreleme yetkilendirme sayılmaz.
- N+1, sınırsız liste ve gereksiz relation eager-load yasaktır.
- Repository/adapters yalnız veri erişimini soyutlar; iş kararını içermez.
- Raw SQL yalnız ORM ile doğru/performanslı ifade edilemeyen durumda; parametreli ve test edilmiş olarak kullanılır.
- Migration’lar forward-only ve veri güvenliği düşünülerek yazılır; destructive değişim için geçiş planı gerekir.

## Tutarlı hata yönetimi

- Domain hata sınıfları en az şu semantik ayrımları korur: validation, unauthenticated, forbidden, not-found, conflict/stale-state, rate-limited, dependency-unavailable, unexpected.
- İstemciye kararlı error code ve güvenli mesaj döndür; stack trace, SQL, provider response veya secret dönme.
- Yetkisiz kaynağın varlığını sızdırmamak gerekiyorsa `404`/`403` seçimi policy’de tutarlı olmalı.
- Expected iş hataları `error` log seviyesiyle gürültü yaratmamalı; unexpected exception correlation/request ID ile loglanmalı.
- Retry yalnız geçici ve idempotent operasyonlarda yapılır. Validation/auth/conflict hataları otomatik retry edilmez.
- Provider timeout/circuit breaker politikası entegrasyon bazında feature spec’e yazılır; global büyülü retry yok.

## Authentication ve yetki kontrolleri

- Handler’da sadece “token var” kontrolü yeterli değildir.
- Her korumalı use-case rol/capability, organization membership, sahiplik/atama, hasta paylaşım izni ve kaynak durumunu doğrular.
- Süper adminin bütün konuşma ve revision içeriklerine erişimi merkezî policy ile uygulanır; bu erişim sürekli yetkidir fakat her okuma/inceleme audit edilir.
- Konuşma katılımcıları eski revision içeriğine erişemez; yalnız güncel içerik ve `edited` metadata’sı döndürülür.
- Klinik temsilcisi için organization ID istemciden güvenilir kabul edilmez; server-side membership’ten çözülür.
- Dosya upload tamamlamak veya bir attachment’ı mesaja/talebe bağlamak sahiplik kontrolünü yeniden yapar.
- WebSocket bağlantı auth’u kadar her subscribe/send olayı da conversation membership kontrolü yapar.
- Background job actor/system context’i açık olmalı; insan kullanıcı gibi taklit edilmemeli.

## Transaction ve veri bütünlüğü

- Mesaj güncelleme + yeni revision + audit; teklif kabulü + lead geçişi; case değişikliği + audit; kuruluş bildirimi kararı + delivery kaydı gibi birlikte doğru olması gereken yazımlar tek transaction veya güvenilir outbox modeli kullanır.
- External provider çağrısını açık DB transaction içinde bekletme.
- Kritik aggregate’lerde optimistic concurrency/version alanı **Proposed**.
- Idempotency scope’u aktör + operation + key üzerinden belirlenmeli; farklı payload ile aynı key conflict üretmeli.
- Unique/index/foreign-key/check constraint’ler yalnız application kontrolüne bırakılmamalı.
- Background job en az bir kez çalışabilir; handler duplicate’e dayanıklı olmalı.
- State transition’lar tek merkezî policy’den geçmeli; route bazında enum set ederek atlanmamalı.

## Mesaj revision ve deterministik denetim

- Mesaj silme use-case’i veya endpoint’i oluşturulmaz.
- Her düzenleme mevcut revision numarasını bekler; stale istek `409` üretir.
- Mesajın güncel içeriği ile eski/yeni revision kaydı ve audit referansı atomik yazılır.
- Revision; message ID, sequence/version, eski içerik, yeni içerik, düzenleyen aktör ve zaman bilgisini taşır. Origin metadata yalnız güvenli ve gerçekten mevcut alanlarla sınırlıdır.
- Katılımcı query/DTO/event’leri revision içeriğini hiçbir şekilde serialize etmez; yalnız süper admin projection’ı revision içeriğine erişir.
- Denetim orijinal mesajı değiştirmez. Ayrı normalize edilmiş görünüm Unicode normalization, locale-aware case folding, Unicode rakam dönüşümü, whitespace/punctuation folding ve sayı kelimesi/hece birleştirme adımlarını sürümlü biçimde uygular.
- Keyword/pattern kuralları config/veri olarak sürümlenir; kod içine dağılmış bağımsız regex’ler oluşturulmaz.
- Eşleşme kanıtı teknik loga yazılmaz. Risk flag’i mesaj/revision ve rule ID’ye referans verir; gerekiyorsa yalnız maskelenmiş özet tutar.
- Mevcut MVP’de AI/model çağrısı, embedding veya harici moderation API’si kullanılmaz.
- Denetim sonucu mesajı otomatik silmez. Engelleme/bekletme ayrıca kabul edilmedikçe yalnız flag ve admin incelemesi üretir.

## Tarih, para, ID ve enum

- Zaman DB’de UTC; API’de RFC 3339. Randevu için IANA time zone ayrı tutulur.
- Para floating-point değildir; minor unit veya exact decimal + ISO 4217.
- Dış ID için UUID foundation baseline’ıdır; API/DB representation ve migration ayrıntıları implementation’da sabitlenir.
- Enum/string literal’lar API contract’tır; rename migration ve compatibility gerektirir.
- Tarih/saat hesapları platformun standart, test edilmiş kütüphanesiyle yapılır; manuel offset matematiği yapılmaz.

## Dosya ve object storage

- DB’de binary yerine metadata ve private object key tutulması **Proposed**.
- Kalıcı public URL kaydedilmez.
- Upload/download yetkisi kısa ömürlü ve bağlama scope’lu olmalı.
- Dosya adı kullanıcı girdisidir; object key veya response header’a güvenli normalize edilmeden taşınmaz.
- MIME yalnız istemci beyanıyla güvenilmez; içerik doğrulaması/tarama stratejisi feature spec’inde belirlenir.
- Sağlık belgesi metadata ve erişim olayları audit edilebilir olmalı; içerik loglanmamalı.

## Environment ve config yönetimi

- Config startup’ta tipli şema ile doğrulanır; eksik kritik değer servis açılışını fail-fast durdurur.
- Secret’lar repo, context belgesi, log, hata response’u veya test fixture’ına yazılmaz.
- Ortamlar arasında aynı config anahtarları kullanılır; kod içi `if production` dalları minimum tutulur.
- Secret rotation ve provider credential scope’u entegrasyon bazında belgelenir.
- `.env.example` ileride yalnız anahtar adları ve güvenli açıklamalar taşır; gerçek değer taşımaz.
- Feature flag ancak gerçek rollout/operasyon ihtiyacı varsa eklenir; belirsiz ürünü kod içine saklamak için kullanılmaz.

## Log seviyeleri ve hassas veri maskeleme

### Seviye kullanımı

- `debug`: Geliştirme ayrıntısı; production’da varsayılan kapalı/örneklenmiş.
- `info`: Servis yaşam döngüsü ve başarılı yüksek seviyeli operasyon özeti; içerik değil metadata.
- `warn`: Beklenen ama operasyonel inceleme gerektiren bozulma, retry, rate limit veya şüpheli durum.
- `error`: Beklenmeyen exception/dependency failure; correlation ID ile.
- Audit olayı teknik log seviyesi değildir; ayrı ürün/audit kaydıdır.

### Zorunlu redaction

Teknik loglara hiçbir koşulda şunların raw değeri yazılmaz:

- Parola, OTP, access/refresh token, cookie, API key, authorization header.
- Sağlık açıklaması, teşhis/tedavi notu, mesaj içeriği, belge içeriği veya storage URL’si.
- Kimlik belgesi numarası, tam telefon/e-posta, adres veya gereksiz kişisel veri.
- AI prompt/completion içinde hassas ham içerik.

Mümkün güvenli alanlar: request ID, endpoint template, method, status, duration, actor ID’nin kontrollü/pseudonymous formu, organization ID, error code, app/platform version. Redaction hem logger seviyesinde hem call-site code review’de uygulanır.

## Audit standartları

- Audit event: actor türü/ID, action, entity türü/ID, zaman, request/correlation ID, organization ve güvenli entity/revision referansı taşır.
- Mesajın eski/yeni içeriği audit event içine ikinci kez kopyalanmaz; kalıcı `MessageRevision` kaydına referans verilir.
- Süper adminin konuşma/revision görüntülemesi, flag incelemesi, şikâyet/destek kararı, follow-up işlemi ve kuruluş bildirimi audit edilir.
- Audit event sonradan düzenlenmez; düzeltme gerekiyorsa yeni event eklenir.
- Kuruluş bildirimi için `sendNotice` Evet/Hayır kararı, hedef organization, actor, zaman ve teslim sonucu audit edilir.
- Retention **Unknown**; feature spec olmadan varsayım yapılmaz.

## Test stratejisi

Test framework ve komutları henüz yoktur; varmış gibi raporlanmaz.

- **Domain/unit:** Durum makineleri, policy, para/tarih ve risk kararları; DB/framework olmadan.
- **Integration:** Gerçek şema üzerinde repository, unique/FK/check constraint, transaction ve concurrency.
- **API contract:** Validation, auth/ownership, error code ve serialization.
- **Security:** Cross-tenant/organization erişim, IDOR, dosya URL’si, admin bypass ve secret redaction.
- **Background jobs:** Retry, duplicate delivery, idempotency ve dead-letter davranışı.
- **WebSocket:** Subscribe/send yetkisi, reconnect/cursor ve mesaj sırası.
- **External adapters:** Sağlayıcı sandbox/fake server ile signature, timeout, retry ve error mapping.

Her test gözlenebilir davranışı korumalı; field copy, framework wiring, mock echo veya yalnız “throw etmedi” testleri eklenmemeli. Feature değişikliklerinde önce ilgili senaryo gerçek yüzeyde smoke-test edilir; kalıcı test yalnız tekrar bozulması makul bir contract’ı koruyorsa eklenir.

## Dependency ekleme ölçütleri

Yeni dependency ancak:

1. Standart kütüphane veya mevcut stack ile güvenli/okunabilir çözülemeyen gerçek ihtiyaç varsa,
2. Lisans, bakım durumu, bundle/runtime maliyeti, güvenlik geçmişi ve transitive bağımlılıklar incelendiyse,
3. Veri/telemetry gönderimi ve ücretlendirme modeli kabul edildiyse,
4. Aynı iş için mevcut dependency yoksa,
5. Framework seçimiyle uyumlu ve test edilebilir bir sınırdaysa eklenir.

Ücretli SaaS, telemetry veya kullanıcı sağlık verisini dışarı çıkaran SDK kullanıcı kararı olmadan eklenmez. Log ekranı, auth, queue veya validation için yeni bir “kendi framework’ümüz” yazılmaz; kabul edilmiş, bakımı sürdürülen araçlar tercih edilir.

## Framework’e özgü Proposed notlar

NestJS + Fastify kabul edilirse:

- NestJS module’leri iş sınırlarına göre; teknik `controllers/`, `services/` mega-modülleri şeklinde değil.
- Fastify request/response nesnesi domain/application katmanına sızmaz.
- Global validation, error mapping ve request ID tek girişte tutarlı kurulur.
- Prisma client doğrudan controller/gateway’den çağrılmaz.
- WebSocket gateway her event’te conversation authorization uygular.
- Pino serializer/redaction config’i başlangıçtan itibaren test edilir.

- Hono MVP foundation için **Rejected**’dır; NestJS/Fastify seçimiyle birlikte bu alternatif implementasyon planının parçası değildir.
