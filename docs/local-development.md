# Local backend çalıştırma

Kod kökü `/Users/berat/medical-tourism/medical-tourism` olan bu proje şu anda frontend değil, NestJS + Fastify backend’idir. Local runtime
varsayılan olarak in-memory adapter kullanır; process kapanınca oluşturulan
organization, inquiry, dosya, quote, appointment ve notification verileri silinir.

## Gereksinimler

- Node.js `22.x` veya `24.x`
- Corepack ve pnpm `10.12.4`
- PostgreSQL, Redis, Firebase veya object storage local çalıştırmak için şu an
  zorunlu değildir.

## Kurulum ve çalıştırma

```bash
cd /Users/berat/medical-tourism/medical-tourism
corepack pnpm@10.12.4 install --frozen-lockfile
cp .env.example .env
corepack pnpm@10.12.4 typecheck
corepack pnpm@10.12.4 test
corepack pnpm@10.12.4 build
corepack pnpm@10.12.4 start
```

Başarılı başlangıçta backend `http://127.0.0.1:4000` adresinde dinler.
İkinci terminalde:

```bash
cd /Users/berat/medical-tourism/medical-tourism
corepack pnpm@10.12.4 smoke
```

Dev server için `corepack pnpm@10.12.4 start:dev` kullanılabilir.

## Mevcut env değişkenleri

| Değişken | Local | Production | Açıklama |
| --- | --- | --- | --- |
| `NODE_ENV` | Opsiyonel, default `local` | Zorunlu olarak `production` | `local`, `test`, `staging`, `production` |
| `HOST` | Opsiyonel, default `127.0.0.1` | Deployment’a göre | Bind adresi |
| `PORT` | Opsiyonel, default `4000` | Deployment’a göre | HTTP portu |
| `APP_VERSION` | Opsiyonel, default `0.1.0` | Önerilir | Güvenli public version etiketi |
| `DATABASE_URL` | Boş bırakılabilir | Şu an startup’ta zorunlu | Production config kapısı; gerçek Prisma adapter henüz bağlı değil |

`.env` otomatik yüklenir. `.env.example` yalnız anahtar ve güvenli default
içerir; Firebase private key, database password, Redis URL, token veya başka
secret yazılmamalıdır.

## Local’de yapılabilenler

- Public treatment/organization/doctor discovery ve cursor/filter denemeleri
- Local actor header adapter ile patient, clinician, super admin ve worker akışları
- Consent, membership, patient profile/preferences
- Inquiry → isolated lead → grant → assignment/state/timeline
- Private file metadata, scan sonucu ve grant kontrollü download reference
- Quote draft/publish/accept/reject/expire
- Appointment propose/confirm/reschedule/cancel/journey
- In-app notification, preferences, read/dedup/retry
- Privacy request/anonymization, audit ve release-gate raporu
- SPEC-001 mesaj/revision/screening/case/follow-up akışları

Local actor örneği:

```text
x-actor-id: patient-local-1
x-actor-type: PATIENT
```

Organization işlemlerinde ayrıca `x-organization-id`, gerekirse
`x-actor-role` kullanılır. Bu adapter gerçek authentication değildir.

## Local’de yapılamayan veya production-ready olmayanlar

- Gerçek Firebase Google/Apple/email-password token doğrulaması ve 15 dakika cache
- PostgreSQL/Prisma persistence, migration ve seed
- Gerçek private object storage, malware scanner ve signed URL provider
- BullMQ/Redis worker, email/push delivery ve dead-letter runtime
- Backup/PITR, OpenBao/Dokploy, Loki/Grafana ve production CI release gate’leri
- Frontend/mobile UI ve Playwright kullanıcı akışları

Bu nedenle local smoke/test başarısı production readiness anlamına gelmez.

## Production env/provider checklist

Provider adapter’ları bağlanırken ayrıca secret manager üzerinden şu kategoriler
sağlanmalıdır; değerler repository’ye veya Obsidian’a yazılmamalıdır:

- PostgreSQL connection reference ve migration target/schema version
- Firebase project/issuer/audience ve server-side credential reference
- Private object-storage bucket/endpoint ve malware scanner credential reference
- Redis connection reference, queue concurrency/retry/dead-letter ayarları
- Email/push provider endpoint ve credential references
- OpenBao secret paths, trusted proxy/CORS/origin ve log redaction policy
- Backup/WAL/PITR, collector/Loki/Grafana ve alert configuration

Bu değişkenlerin kesin isimleri provider adapter implementation’ı sırasında
ayrıca sabitlenmelidir; şu an uygulama yalnız üstteki beş config değişkenini okur.
