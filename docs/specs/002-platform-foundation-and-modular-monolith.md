# SPEC-002 — Platform Foundation ve Modüler Monolith

- **Durum:** Accepted — foundation karar kapısı kapatıldı; implementation kayıtları ayrıca tutulacak
- **Tarih:** 1 Ekim 2026
- **Tür:** Backend platform/foundation specification
- **Uygulama durumu:** Başlanmadı
- **Mimari:** Modüler monolith — **Accepted**
- **Runtime / framework:** Node 22 LTS + TypeScript + NestJS 11/Fastify 5 — **Accepted**; patch/build ayrıntısı implementation’a bırakıldı
- **Package manager / ORM:** pnpm 10 + Prisma 6 — **Accepted**; lockfile/build pinleme implementation’da
- **Veritabanı:** PostgreSQL — **Accepted**
- **API / realtime / primitive’ler:** Versioned HTTP + RFC 9457 JSON Problem Details; UUID + Zod + cursor pagination; WebSocket reconnect + cursor replay + ack — **Accepted**
- **Authentication baseline:** Firebase Authentication; Google, Apple ve email/password; Firebase token validation + kısa süreli cache; 2FA sonraki faz — **Accepted**
- **Operasyon:** Docker + Dokploy + fail-fast config; ayrı migration release; OpenBao runtime references; expand/contract rollback — **Accepted**
- **Job/cache / recovery:** BullMQ + Redis zorunlu job backend; `<domain>.<operation>` queue naming; zorunlu jobId/idempotency; exponential backoff + bounded attempts + dead-letter; Redis/Postgres recovery runbook; günlük full + sürekli WAL/PITR; aylık staging restore + production-safe sample; RPO 15 dakika / RTO 1 saat — **Accepted baseline**
- **Gözlemlenebilirlik / test:** Pino JSON → self-hosted collector → Loki/Grafana; 30 gün operational log retention; OTLP trace export adayı; PII redaction; PostgreSQL audit; GitHub Actions lint/typecheck/unit/integration/API/security/smoke/UAT gates — **Accepted baseline**

## 1. Amaç

MVP backend’inin tek deploy edilebilir modüler monolith olarak güvenli, tekrar üretilebilir ve gözlenebilir biçimde kurulması için platform sözleşmesini tanımlar. Kullanıcı seçtiği stack’in uyması gereken ortak API, config, request correlation, migration ve modül bağımlılığı sınırlarını bu spec ile kabul etmiştir.

Bu spec, implementation planını başlatacak foundation sözleşmesidir. UUID/ULID, validation aracı, pagination ayrıntısı, auth/session ve bazı operasyon hedefleri gibi açık alt kararlar implementation öncesi ayrıca kapatılır.

## 2. Kabul edilmiş kararlar

1. Backend ilk MVP’de **modüler monolith** olacaktır.
2. Runtime ve dil **Node.js + TypeScript** olacaktır.
3. HTTP framework **NestJS + Fastify adapter** olacaktır.
4. Birincil veritabanı **PostgreSQL**, veri erişim katmanı **Prisma** olacaktır.
5. API temel transport’u **versioned HTTP + JSON envelope** olacaktır.
6. Config startup’ta typed validation ile fail-fast çalışacaktır.
7. Deployment temel yaklaşımı **Docker + Dokploy** olacaktır.
8. Background job ve cache foundation’ında **PostgreSQL + Redis** kullanılacaktır.
9. Teknik gözlemlenebilirlik self-hosted structured logging yaklaşımında; ürün audit’i PostgreSQL append-oriented kayıtlarında tutulacaktır.
10. İlk deploy tek backend uygulaması ve tek ilişkisel veri kaynağı sınırında planlanır.
11. Mikroservis, event bus veya ayrı deploy edilebilir servis foundation kapsamına alınmaz.
12. Modüller iş sınırıyla ayrılır; başka modülün persistence tablosuna doğrudan yazılmaz.
13. Transport, application/use-case, domain/policy, data-access ve integration sorumlulukları birbirine karıştırılmaz.
14. Ortak teknik davranışlar merkezi primitive olarak tanımlanır; ürün davranışı `shared` klasörüne taşınmaz.
15. API, job ve entegrasyon girdileri sınırda doğrulanır; authorization ve state transition application/domain katmanında kalır.
16. Secret, token, ham sağlık verisi, mesaj, revision, belge veya hassas kişisel veri teknik loglara yazılmaz.
17. Ücretli SaaS, AI/model provider veya ham veri dışa aktarımı bu spec ile kabul edilmez.

## 3. Kapsam

### 3.1 Dahil

- Runtime ve framework seçim kapısı.
- TypeScript/build/runtime güvenlik sözleşmesi veya seçilen dilin eşdeğerleri.
- Modüler monolith iş sınırları ve dependency yönü.
- Ortak request ID/correlation ID davranışı.
- API version, güvenli error envelope ve pagination temel sözleşmesi.
- Environment/config şeması, secret yükleme ve fail-fast startup.
- Tek ilişkisel DB bağlantı sınırı, migration ve seed kuralları.
- Transaction, idempotency ve optimistic concurrency temel kuralları.
- Sağlık/readiness kontrolü ve graceful shutdown sözleşmesi.
- Yapısal teknik log ile ürün audit log’unun ayrılması.
- Background job adapter sınırı; belirli queue ürünü seçimi değil.
- Local/test/staging/production ortam ayrımı.
- Foundation acceptance ve gerçek davranış doğrulama planı.

### 3.2 Kapsam dışı

- Hasta/klinik/admin auth ve session implementasyonu; SPEC-003.
- Hasta profili, kuruluş/doktor/treatment domain’i.
- Message, revision, screening, complaint/support veya follow-up domain implementasyonu; SPEC-001 ve ilgili bağımlılıklar.
- Fiziksel ürün tabloları ve feature migration’ları; ilgili feature spec’leri.
- Object storage sağlayıcısı ve dosya tarama akışı; SPEC-008.
- Push/e-posta/SMS sağlayıcısı ve notification delivery; SPEC-011.
- AI/LLM/embedding/moderation provider.
- Ödeme, referral, concierge, WhatsApp veya video görüşme.
- Admin, hasta veya klinik UI.
- Mikroservis, event bus, service mesh veya ayrı deploy pipeline’ları.
- Üretim credential’ları, gerçek secret’lar veya gerçek hasta verisi.

## 4. Aktörler ve sorumluluk matrisi

| Aktör | Foundation kapsamındaki davranış |
| --- | --- |
| API client | Request ID taşıyabilir; response envelope ve güvenli hata sözleşmesini tüketir |
| Authenticated user | Foundation tek başına business yetkisi vermez; rol/ownership kontrolü ilgili spec’e bırakılır |
| Süper admin | Foundation seviyesinde özel bypass yoktur; admin yetkisi SPEC-003 ve ilgili policy ile uygulanır |
| Background worker | Açık system actor context’i, idempotency ve retry metadata’sı ile çalışır |
| Operator/deployer | Config, migration, health/readiness ve shutdown sözleşmesini işletir; ham veri okuyamaz |
| External provider adapter | Timeout, signature, retry ve güvenli hata mapping’i ile sınırlandırılır |

## 5. Foundation mimarisi

### 5.1 Modül sınırları

Başlangıç iş modülleri, bağımlılık sırasını görünür kılacak şekilde şu kavramsal sınırları kullanır:

1. `platform` — config, request context, error taxonomy, clock, ID, health ve lifecycle primitive’leri.
2. `identity-access` — SPEC-003 tarafından sahiplenilir; foundation yalnız interface/policy seam sağlar.
3. `patient` — SPEC-004.
4. `provider-directory` — SPEC-005.
5. `inquiry-lead` — SPEC-007.
6. `files` — SPEC-008.
7. `messaging` — SPEC-001.
8. `screening-review` — SPEC-001.
9. `quotes` — SPEC-009.
10. `appointments-journey` — SPEC-010.
11. `notifications` — SPEC-011.
12. `audit-operations` — SPEC-012 ve ilgili feature’lar.

Bu liste fiziksel klasör veya framework module adı olarak zorunlu değildir; iş sahipliğini ve veri erişim sınırını gösterir.

### 5.2 Bağımlılık yönü

İzinli genel yön:

```text
transport -> application/use-case -> domain/policy
                                  -> port/interface -> data/integration adapter
jobs ------> application/use-case
platform --> ortak teknik primitive; ürün kararı değil
```

Kurallar:

- Domain/policy framework, ORM, HTTP client veya provider SDK import etmez.
- Controller/gateway/handler ORM sorgusu, transaction zinciri veya provider SDK akışı taşımaz.
- Bir modül başka modülün repository’sini veya tablosunu doğrudan kullanmaz.
- Çapraz modül davranışı açık application use-case, port veya domain event seam’i üzerinden çağrılır.
- Foundation event seam’i, ayrı event bus veya dağıtık teslim garantisi anlamına gelmez.
- `shared` yalnız clock, ID, error, request context ve güvenli primitive’ler gibi gerçek çapraz kesen ihtiyaçları taşır.

### 5.3 Tek deploy ve tek veri kaynağı

- MVP foundation tek deploy edilebilir backend olarak paketlenir.
- Modüller aynı process içinde çalışabilir; process içi çağrıların sınırı açık kalır.
- Birincil persistence tek ilişkisel DB bağlantısı üzerinden planlanır.
- DB dışı cache, queue veya event store ancak ilgili ihtiyaç ve karar kabul edilirse eklenir.
- Modül ayrımı gelecekte ayrı servise taşınabilirlik iddiası değil; sahiplik ve veri bütünlüğü disiplinidir.

## 6. Stack karar kapısı

Kullanıcı aşağıdaki foundation seçimlerini kabul etti:

| Karar | Accepted seçim | Kalan alt karar |
| --- | --- | --- |
| Runtime/dil | Node 22 LTS + TypeScript | Patch pinleme ve Docker build image implementation’da |
| Package manager | pnpm 10 | Lockfile CI ayrıntısı implementation’da |
| HTTP/framework | NestJS 11 + Fastify 5 | Patch/config ayrıntısı implementation’da |
| Veritabanı | PostgreSQL | Sürüm, hosting ve pool ayrıntısı |
| ORM/data access | Prisma 6 | Locking ve query ayrıntısı |
| API/realtime | Versioned HTTP + RFC 9457 JSON Problem Details + WebSocket | `/api/v1` standard catalog implementation’da |
| API primitive’leri | UUID + Zod + cursor pagination | Cursor encoding ve field error mapping standard catalog içinde |
| Authentication baseline | Firebase Authentication; Google, Apple, email/password; Firebase token validation + kısa süreli cache | 2FA sonraki faz |
| WebSocket contract | Reconnect + cursor replay + delivery acknowledgement | Event schema ve authorization ayrıntısı SPEC-001’de |
| Job/cache | BullMQ + Redis zorunlu job backend; `<domain>.<operation>` queue naming; jobId/idempotency; exponential backoff + bounded attempts + dead-letter | Domain-specific state transition ayrıntısı |
| Deployment/config | Docker + Dokploy + fail-fast config; ayrı migration release; OpenBao runtime references | Path/mapping implementation kayıtlarında |
| Rollback | Expand/contract migration + previous image rollback | Deployment runbook implementation’da |
| Recovery | Günlük full + sürekli WAL/PITR; aylık staging restore + production-safe sample; RPO 15 dk / RTO 1 saat | Restore artifact’i implementation kayıtlarında |
| Observability/audit/test | Pino JSON → self-hosted collector → Loki/Grafana; 30 gün operational retention; OTLP trace export adayı; PII redaction; PostgreSQL audit; GitHub Actions lint/typecheck/unit/integration/API/security/smoke/UAT gates | Collector/alert ayrıntıları implementation’da |

Foundation kararları kapatılmıştır. Implementation sırasında patch/build pinleme, OpenBao path mapping, RFC 9457 catalog dosyası, restore artifact’i ve collector/alert yapılandırması kayda bağlanır.

Açık alt kararlar kapatılmadan yeni teknoloji veya ayrıntı sessizce “Accepted” yapılmaz. Her yeni seçim adaylar, reddedilen alternatif, gerekçe, maliyet/veri etkisi ve geri dönüş planını içerir.

## 7. Ortak API sözleşmesi

### 7.1 Request context

Her inbound request ve iş başlangıcı mümkün olduğunca şu metadata’yı taşır:

- `requestId`: istemci sağlasa bile server tarafından doğrulanmış veya yeniden üretilmiş correlation ID.
- `actorContext`: authenticated user, system worker veya operator türü; token/secret değil.
- `organizationContext`: yetkilendirme sonrası çözülen organization scope; istemci beyanı güvenilir kabul edilmez.
- `receivedAt`: server zamanı.
- `idempotencyKey`: yalnız destekleyen mutasyonlarda, scope’u açıkça tanımlanmış değer.
- `locale` ve `timeZone`: yalnız ürün sözleşmesi izin verirse; güvenlik veya sahiplik bilgisi değildir.

Request ID ham kullanıcı girdisini veya mesaj içeriğini taşımaz. External callback’lerde signature/replay metadata’sı ayrıca doğrulanır.

### 7.2 Response envelope

- Response envelope Accepted versioned HTTP + JSON temelinde uygulanır; `data`, `requestId`, `meta` ve güvenli error alanları korunur. Cursor pagination da Accepted’tır.

- Başarılı response: `data`, `requestId`, gerekiyorsa `meta`.
- Hata response: güvenli `code`, kullanıcıya uygun `message`, `requestId`, alan bazlı `details`.
- `details` secret, SQL, stack trace, provider response veya ham mesaj/revision taşımaz.
- HTTP veya transport status mapping’i `unauthenticated`, `forbidden`, `not_found`, `validation`, `conflict`, `rate_limited`, `dependency_unavailable`, `unexpected` ayrımını korur.
- İç exception tipi dışarı sızmaz; mapping tek merkezî policy’de tutulur.

### 7.3 Listeleme ve pagination

- Sınırsız liste response’u yoktur.
- Her liste operation’ı server-side limit ve maksimum sayfa boyutuna sahiptir.
- Cursor pagination kullanılır; cursor veritabanı secret’ı veya ham sorgu detayı açmaz.
- Sıralama deterministic olmalı; eşit zamanlarda sabit ikincil anahtar kullanılmalıdır.

## 8. Config ve environment sözleşmesi

### 8.1 Startup davranışı

- Config startup’ta tek bir Zod şeması üzerinden parse ve validate edilir.
- Kritik eksik/geçersiz config ile servis hazır duruma geçmez.
- Unknown environment key politikası bütün ortamlarda tutarlı olur; secret benzeri anahtarlar yanlışlıkla loglanmaz.
- Config erişimi application/domain kodunda doğrudan process environment okumak yerine typed config portundan yapılır.
- Runtime config ile build-time config ayrımı açıkça belgelenir.
### 8.2 Zorunlu config kategorileri

Accepted stack artık sabittir; config key isimleri, sürümler ve provider ayrıntıları implementation hazırlığında kesinleştirilir:

- `app`: servis adı, ortam, güvenli public version.
- `http`: bind/port, body/list limitleri, timeout ve trusted proxy politikası.
- `database`: bağlantı referansı, pool sınırları; secret değeri loglanmaz.
- `migration`: ayrı release adımı, hedef schema version ve rollback/expand-contract metadata’sı.
- `auth`: SPEC-003 tarafından sağlanan doğrulama interface ayarları.
- `secretManager`: secret referansları; ham secret config snapshot veya log’a girmez.
- `logging`: Pino yapılandırması, redaction ve request ID davranışı.
- `cors/origin`: mobil/web client origin politikası gerekiyorsa.
- `jobs`: Redis connection reference, worker concurrency, retry, dead-letter ve shutdown grace ayarları.
- `storage/integrations`: yalnız ilgili feature kabul ederse provider referansları.

### 8.3 Secret kuralları

- Secret repository, `.env.example`, context, spec, log, error response veya test fixture’a yazılmaz.
- `.env.example` yalnız anahtar adlarını ve güvenli açıklamayı taşır.
- Secret rotation uygulama yeniden başlatma veya provider destekli kontrollü reload ile belgelenir.
- Production secret’ı local/staging config’e kopyalanmaz.

## 9. Persistence, migration ve transaction

### 9.1 DB temel kuralları

- Persistence modeli feature spec’lerinde sahiplenilir; foundation ortak bağlantı/lifecycle sınırını tanımlar.
- Migration forward-only ve sıralı olur; destructive değişiklik için expand/contract veya açık geçiş planı gerekir.
- Foreign key, unique, not-null, check ve length invariant’ları yalnız application koduna bırakılmaz.
- Timestamps UTC saklanır; timezone-sensitive business alanları timezone bilgisiyle ayrıca taşınır.
- Binary sağlık belgesi/message attachment DB’ye gelişigüzel konmaz; ilgili file spec’i karar verir.
- Recovery baseline: günlük şifreli full backup + sürekli WAL/PITR; restore tatbikatı, region ve kesin RPO/RTO implementation/operations planında kapatılır.

### 9.2 Transaction sınırı

Aşağıdaki işlemler tek transaction veya güvenilir outbox sınırında atomik olmalıdır:

- Message current state + MessageRevision + audit referansı.
- Feature entity mutasyonu + state transition + audit.
- Notification/organization notice karar kaydı + teslim işinin güvenilir enqueue edilmesi.
- Idempotency key kaydı + ilgili mutasyon sonucu.
- Migration metadata + schema state.

External provider çağrısı açık DB transaction içinde bekletilmez.

### 9.3 Idempotency ve concurrency

- Mutasyon operation’ı destekliyorsa idempotency scope’u actor/system context + operation + key olarak tanımlanır.
- Aynı key ve aynı payload önceki sonucu güvenli biçimde tekrar döndürebilir.
- Aynı key ile farklı payload `conflict` üretir.
- Kritik aggregate’lerde expected version/optimistic concurrency kullanımı ilgili spec’te belirtilir.
- Background job en az bir kez çalışabilir; handler duplicate’e dayanıklı tasarlanır.

## 10. Health, lifecycle ve güvenilirlik

### 10.1 Health kontrolleri

En az üç ayrı kavram desteklenir:

- **Liveness:** process event loop/lifecycle olarak çalışıyor mu?
- **Readiness:** zorunlu bağımlılıklarla güvenli request kabul edebilir mi?
- **Startup/migration status:** servis hangi foundation sürümüyle başlatıldı; migration tamam mı?

Health response’ları secret, connection string, stack trace veya hassas ürün verisi döndürmez. Dependency ayrıntısı operator log/metric sınırında kalır.

### 10.2 Graceful shutdown

- Yeni request/job kabulü kontrollü biçimde durdurulur.
- Açık request, DB connection ve worker işlerinin güvenli kapanma süresi vardır.
- Süre aşımı process’i sonsuza kadar bekletmez; yarım kalan iş idempotent retry için görünür bırakılır.
- Shutdown sebebi teknik logda request ID ve servis metadata’sı ile izlenebilir; ham veri yazılmaz.

### 10.3 Retry ve timeout

- Retry yalnız transient, güvenli ve idempotent işlemlerde uygulanır.
- Validation, auth, forbidden ve conflict hataları otomatik retry edilmez.
- Redis zorunlu job backend olduğundan worker timeout, backoff, max attempt, dead-letter ve Redis failure/recovery davranışını ilgili feature spec’i açıkça tanımlar.
- Global, kaynağı belirsiz “her şeyi retry et” mekanizması eklenmez.

## 11. Log, audit ve gözlemlenebilirlik

### 11.1 Teknik log

Teknik loglar yapılandırılmış metadata taşır:

- `requestId`, operation/route template, status, duration, actor type, pseudonymous actor ID, organization ID, error code, service version.
- `debug` production’da varsayılan kapalı veya örneklenmiş olur.
- `info` içerik değil yüksek seviye operation sonucu taşır.
- `warn` retry, rate limit, dependency degradation veya şüpheli durum içindir.
- `error` beklenmeyen exception/dependency failure içindir.

Raw parola, OTP, token, authorization header, tam telefon/e-posta, sağlık açıklaması, mesaj/revision, belge veya provider secret loglanmaz.

### 11.2 Audit ayrımı

- Audit ürün kaydıdır; teknik log değildir.
- Audit event append-only olur ve actor, action, entity, time, request/correlation ID, organization ve güvenli referans taşır.
- Audit event içine ham message/revision veya belge içeriği tekrar kopyalanmaz.
- Foundation yalnız audit port/interface ve güvenli metadata standardı sağlar; event listesi feature spec’lerinde sahiplenilir.
- Audit retention, erişim ve silme/anonymization kuralları SPEC-012 ile kesinleşir.

### 11.3 Metrics/tracing

- Pino + Loki/Grafana self-hosted logging yaklaşımı seçildi; kesin logger/collector sürümleri implementation’da kapanır.
- OpenTelemetry metric/trace için adaydır; production etkinliği ve export hedefi ayrıca kabul edilir.
- Gerekli minimum sinyaller: request latency/error, DB/dependency failure, job retry/failure, readiness ve process lifecycle.
- Telemetry payload’ı ham kullanıcı içeriği taşımaz.

## 12. Hata, güvenlik ve sınır davranışı

- Authentication ile resource authorization ayrıdır.
- Foundation “token var”ı erişim kabulü saymaz.
- Organization/ownership scope’u DB sorgusunda görünür uygulanır; sonradan filtrelemek authorization değildir.
- Yetkisiz resource’ın varlığını gizlemek gerekiyorsa policy kontrollü `not_found` kullanabilir.
- Unhandled exception dışarı stack trace, SQL veya provider response olarak dönmez.
- Request body, header ve liste boyutları üst sınırlıdır.
- CORS, trusted proxy, host header ve request size politikaları startup config’inde açıkça seçilir.
- Migration veya startup failure güvenli fail-fast davranışı üretir; eski schema ile sessizce çalışmaya devam edilmez.
- Security-sensitive action’lar actor/request ID ile audit portuna gönderilir.

## 13. Kavramsal veri modeli

Fiziksel tablo veya migration değildir. Foundation’ın sahip olduğu kavramlar:

| Varlık | Sorumluluk | Sahiplik |
| --- | --- | --- |
| `RequestContext` | request/correlation, actor ve organization scope metadata’sı | Platform |
| `IdempotencyRecord` | operation scope, key, payload fingerprint ve güvenli sonuç referansı | Platform/application |
| `MigrationRecord` | uygulanan migration/version metadata’sı | Platform/DB tooling |
| `OutboxRecord` | güvenilir internal job/notification enqueue referansı | Platform/application |
| `HealthSnapshot` | liveness/readiness sonucu ve güvenli dependency status’u | Platform |
| `AuditEvent` | ürün işlemi ve hassas erişim izi | SPEC-012/feature’lar |
| `ConfigSnapshot` | secret içermeyen başlatma/version metadata’sı | Platform/operations |

`IdempotencyRecord` ham payload, message, revision, sağlık veya belge içeriğini saklamaz; yalnız güvenli fingerprint ve sonuç referansı kullanır.

## 14. API ve operasyon işlem grupları

Framework endpoint yolu bu spec’te verilmez. Foundation implementation en az şu işlem gruplarını sağlamalıdır:

1. Config validate ve startup sonucu üret.
2. Request/correlation ID üret, kabul et ve response’a ekle.
3. Güvenli error envelope ve status mapping uygula.
4. Liveness/readiness/startup status bildir.
5. Graceful shutdown başlat ve işleyen işleri kontrollü kapat.
6. Migration status göster; migration çalıştırma yetkisini deployment policy’ye bırak.
7. Idempotency kaydı oluştur/getir/conflict üret.
8. Internal outbox/job enqueue ve güvenli sonuç takibi sağla.
9. Teknik log redaction ve audit portlarını sağlar.
10. Pagination/limit/ordering ortak kurallarını uygula.
11. Runtime version ve config snapshot’ın secret içermeyen metadata’sını bildir.

## 15. Hata ve çakışma davranışı

| Durum | Beklenen semantik |
| --- | --- |
| Eksik/geçersiz kritik config | Startup failure; readiness yok |
| Migration geride veya uyumsuz | Startup/deployment failure; sessiz eski schema kullanımı yok |
| Geçersiz request boundary | `validation` |
| Kimlik yok/geçersiz | `unauthenticated` |
| Kaynak policy reddi | `forbidden` veya policy’ye göre `not_found` |
| Idempotency key farklı payload | `conflict` |
| Optimistic version stale | `conflict` |
| DB/dependency geçici hata | güvenli `dependency_unavailable`; yalnız idempotent iş retry edilebilir |
| Readiness dependency başarısız | Readiness false; liveness gereksiz yere false yapılmaz |
| Shutdown timeout | Kontrollü termination; yarım iş retry/operasyon kaydı |
| Beklenmeyen exception | Güvenli `unexpected`, request ID; detay yalnız redacted log |
## 16. Kabul kriterleri

1. Spec, modüler monolith mimarisini Accepted ve ilk MVP sınırı olarak tanımlar.
2. Kullanıcı tarafından seçilen Node.js LTS + TypeScript, pnpm, NestJS/Fastify, PostgreSQL, Prisma, versioned HTTP + RFC 9457 JSON Problem Details, UUID, Zod, cursor pagination, WebSocket, Firebase Authentication baseline, Docker + Dokploy, ayrı migration release, OpenBao runtime references, BullMQ + Redis, günlük full + WAL/PITR, aylık staging restore + production-safe sample, RPO 15 dk/RTO 1 saat, Pino + Loki/Grafana, PostgreSQL audit ve GitHub Actions CI kararlarını doğru biçimde taşır; implementation kayıtlarını ayrıca belirtir.
3. İş modülleri ve platform primitive’leri ayrı sorumluluklarla listelenir.
4. Transport → application → domain/policy bağımlılık yönü açıkça uygulanabilir durumdadır.
5. Domain/policy katmanının framework/ORM/provider SDK import etmeyeceği kuralı yazılıdır.
6. Bir modülün başka modül tablosuna doğrudan yazması foundation kuralıyla engellenir.
7. Tek deploy ve tek ilişkisel persistence sınırı korunur; BullMQ + Redis yalnız job/cache kararında tanımlanan sınırda kullanılır, event bus/microservice otomatik eklenmez.
8. Request ID, actor context, organization scope ve idempotency metadata’sı tanımlıdır.
9. RFC 9457 standard error catalog; validation, unauthenticated, forbidden, not-found, conflict, rate-limit, dependency ve unexpected ayrımlarını korur.
10. Liste API’lerinde sınırsız response yasaktır; cursor pagination, limit ve deterministic ordering kullanılır.
11. Kritik config startup’ta Zod şemasıyla doğrulanır; eksik değer servis readiness’ini engeller.
12. Secret’ların repo, context, log, error response veya fixture’a yazılmayacağı kabul kriteridir.
13. Migration’lar forward-only ve ayrı release adımıyla çalıştırılmalı; destructive değişiklik transition planı olmadan uygulanmamalıdır.
14. Transaction sınırı ve external provider çağrısını transaction içinde bekletmeme kuralı tanımlıdır.
15. Aynı idempotency key/farklı payload conflict üretir; background iş duplicate’e dayanıklı olur.
16. Liveness, readiness ve startup/migration status birbirinden ayrılır.
17. Graceful shutdown yeni iş kabulünü durdurur ve yarım işleri güvenli retry/operasyon sonucuna bırakır.
18. Retry yalnız transient ve idempotent operations için uygulanır; validation/auth/conflict retry edilmez.
19. Teknik log ile ürün audit log’u ayrıdır.
20. Teknik loglarda raw token, OTP, secret, sağlık, mesaj/revision, belge veya tam iletişim bilgisi bulunmaz.
21. Audit portu güvenli entity/revision referansı taşır; ham içerik kopyalamaz.
22. Health/readiness response’ları connection string, stack trace ve hassas ürün verisi açığa çıkarmaz.
23. Migration/startup incompatibility sessiz fallback olmadan görünür failure üretir.
24. Foundation, auth/session ve feature domain implementasyonlarını ilgili spec’lere bırakır.
25. Firebase token validation + kısa süreli cache, RFC 9457 catalog, OpenBao runtime references, aylık staging restore + production-safe sample ve self-hosted observability baseline implementation kayıtlarıyla doğrulanır; patch/build ve test framework ayrıntıları implementation’da sabitlenir.
26. Bu spec uygulama kodu, schema, migration veya gerçek provider entegrasyonu içermez.

## 17. Bağımlılıklar

Implementation öncesi:

- SPEC-003 ile Firebase Authentication identity/session/role ve actor context sözleşmesi; 2FA sonraki fazdır.
- SPEC-001 ile WebSocket mesaj lifecycle’ı ve conversation authorization kararı.
- Implementation ile patch pinleme, Docker build image, Prisma locking/query, test framework ve CI komutları.
- OpenBao ürün/path/environment mapping ve Dokploy runtime references.
- SPEC-011 ile notification/outbox/delivery sınırı.
- SPEC-012 ile audit, retention, privacy, PITR tatbikatı ve operational readiness.
- İlgili feature spec’leri ile BullMQ state transition, idempotency ve failure handling ayrıntıları.

## 18. Implementation kayıtları

Foundation kararları için yeni ürün/teknoloji seçimi açık değildir. Implementation başlamadan veya sırasında şu kayıtlar canonical belgelerde tutulur:

1. RFC 9457 `type`/`code` catalog dosyası, field error mapping ve `/api/v1` resource contract.
2. OpenBao path/environment mapping ve Dokploy runtime reference formatı.
3. Aylık staging restore + production-safe sample artifact’i: run ID, timestamps, measured RPO/RTO, readiness kanıtı ve remediation.
4. Self-hosted collector seçimi, Loki/Grafana dashboard/alert, OTLP export ve 30 günlük operational retention configuration.
5. Node/Nest/Fastify/Prisma patch pinleme, Docker build image, test framework ve CI komutları.

## 19. Doğrulama planı

Implementation yapıldığında şu gerçek senaryolarla doğrulanmalıdır:

1. Eksik kritik config ile servis readiness vermeden güvenli biçimde kapanır.
2. Geçerli config ile startup, liveness, readiness ve runtime version sonucu secret açmadan gözlenir.
3. Request ID yokken server üretir; güvenli bir istemci ID’si policy’ye göre kabul edilir; response ve redacted log korele olur.
4. Validation, unauthenticated, forbidden, not-found, conflict ve dependency failure farklı güvenli error code’larına dönüşür.
5. Aynı idempotency key ve aynı payload duplicate side effect üretmez; farklı payload conflict üretir.
6. Migration gerideyken servis sessizce çalışmaz; açık startup/deployment failure verir.
7. Graceful shutdown yeni iş alımını durdurur; çalışan idempotent job retry edilebilir durumda kalır.
8. Teknik log örneklerinde secret, token, OTP, raw message/revision, belge ve tam iletişim bilgisi yoktur.
9. Audit event ve teknik log ayrı yüzeylerde oluşturulur; audit raw içerik kopyalamaz.
10. Modül sınırı ihlali ve domain katmanına framework/ORM import’u architecture/code review kontrolünde yakalanır.
11. Readiness dependency failure liveness’i gereksiz yere bozmaz.
12. Selected stack’in build/type-check, ayrı migration release, unit/integration/API/security CI, deployment smoke/UAT ve rollback komutları proje giriş belgelerine eklenir.
