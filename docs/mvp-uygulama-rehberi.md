# Medical Tourism MVP — Ürün ve Uygulama Rehberi

## 1. Ürün amacı

Medical Tourism, uluslararası hastayı doğrulanmış hastane/klinik, doktor ve
tedavi seçenekleriyle buluşturan bir süreç platformudur. Ürünün ana değeri,
hastanın araştırmadan tedavi sonrası takibe kadar ilerleyen akışını tek bir
güvenli kayıt ve iletişim zincirinde toplamasıdır.

Platform tıbbi teşhis veya tedavi önerisi üretmez. Klinik ve doktor bilgilerini
doğrulanabilir katalog olarak sunar; talep, dosya paylaşımı, mesajlaşma, teklif,
randevu ve süreç durumlarını yetkili aktörler arasında yönetir.

## 2. Kullanıcılar ve yetkileri

### Hasta

Hasta public keşif yapabilir; talep, mesaj, dosya, teklif, randevu ve gizlilik
işlemleri için authenticated olmalıdır. Kendi profilini, tercihlerini,
izinlerini ve kendisine ait süreç kayıtlarını görür.

### Organization member/admin

Klinik temsilcisi yalnızca aktif kuruluş üyeliği, ilgili lead ataması ve açık
paylaşım izni bulunan kaynaklara erişebilir. Hastanın paylaşmadığı alanları veya
başka kuruluşa ait lead’leri göremez.

### Süper admin

Süper admin doğrulama, denetim, şikâyet/destek, risk flag, kuruluş bildirimi ve
operasyon işlemlerini yönetir. Mesajların güncel ve eski revision içeriklerine
erişebilir; bu erişim audit kaydı üretir.

### Doktor profili

Doktor profili kuruluş tarafından yönetilir. Doktor profili bağımsız login veya
session aktörü değildir.

## 3. MVP kullanıcı yolculuğu

### A. Keşif

Anonymous veya authenticated kullanıcı, yalnızca `published + verified + active
+ public-safe` kayıtları görür. Kuruluş, doktor ve tedavi araması PostgreSQL-first
ve allowlisted filtrelerle çalışır. Cursor pagination varsayılan 20, üst sınır
50 kayıttır. Favoriler hastaya özeldir ve arama sıralamasını değiştirmez.

### B. Tedavi talebi ve lead

Hasta minimum yapılandırılmış intake’i doldurur, güncel genel rızayı verir ve
bir ila üç uygun kuruluş seçer. Her kuruluş için ayrı lead, paylaşım grant’i ve
ilk timeline olayı oluşturulur. Inquiry ve Lead durumları birbirinden ayrıdır;
durum değişiklikleri optimistic version, idempotency ve append-only history ile
korunur.

### C. Mesajlaşma ve screening

Hasta ile yetkili klinik temsilcisi conversation üzerinden mesajlaşır. Mesaj
edit’i eski içeriği yok etmez; yeni revision üretir. Katılımcılar güncel içeriği
ve düzenlendi göstergesini görür, eski içeriği yalnız süper admin görür.

Screening AI kullanmaz. Normalizasyon sonrası telefon, email, URL, external
channel, IBAN-like desen, Unicode rakam, yazıyla veya parçalanarak verilen sayı
ve yapılandırılmış risk kelimeleri sürümlü deterministik kurallarla taranır.
Eşleşme risk flag oluşturur; kanıt maskelenmiş tutulur.

### D. Dosya paylaşımı

Dosya metadata’sı uygulama verisiyle, binary içerik ise private object storage
ile ilişkilendirilir. Upload intent MIME, boyut, checksum ve scan durumunu
taşır. Pending, quarantine veya available durumundaki dosyaya erişim grant ve
aktör yetkisiyle belirlenir. Public download URL verilmez.

### E. Teklif, randevu ve tedavi yolculuğu

Klinik minor-unit para tutarı ve ISO 4217 para birimiyle teklif oluşturur.
Hasta teklifi kabul, red veya beklemede tutabilir. Kabul ödeme yapılmış veya
lead terminal duruma gelmiş anlamına gelmez.

Randevular RFC3339/UTC zamanı ve IANA timezone bilgisi taşır. Propose, confirm,
reschedule, cancel, complete ve no-show geçişleri yetki ve çakışma kontrolleriyle
yapılır. Yolculuk olayları append-only timeline’a eklenir.

### F. Bildirim, gizlilik ve operasyon

In-app notification merkezi recipient isolation, güvenli template reference,
deduplication, read ve bounded retry davranışını destekler. Gerçek email/push
provider teslimi ayrı entegrasyon işidir.

Hasta privacy request oluşturabilir, iptal edebilir veya anonymization sürecini
başlatabilir. Anonymization audit referansını korur; profil, tercih, favori ve
aktif grant erişimi kaldırılır. Hesap silme ve hassas erişimler audit edilir.

## 4. Spec haritası

| Spec | Sorumluluk | Durum |
| --- | --- | --- |
| SPEC-001 | Mesaj yönetişimi, screening, risk flag, şikâyet/destek, follow-up | Hazır; executable slice var |
| SPEC-002 | Platform foundation, config, hata, lifecycle, gözlemlenebilirlik | Hazır; executable slice var |
| SPEC-003 | Identity, session, consent, membership, roller | Hazır; local actor slice var |
| SPEC-004 | Hasta profili, tercihler, private sharing, anonymization | Hazır; executable slice var |
| SPEC-005 | Organization, doctor, treatment, verification, publication | Hazır; executable slice var |
| SPEC-006 | Discovery, search, filters, cursor, favorites | Hazır; executable slice var |
| SPEC-007 | Inquiry, lead, grant, assignment, timeline, follow-up | Hazır; executable slice var |
| SPEC-008 | Private file metadata, scan ve authorized access | Hazır; executable slice var |
| SPEC-009 | Quote lifecycle ve concurrency | Hazır; executable slice var |
| SPEC-010 | Appointment ve treatment journey | Hazır; executable slice var |
| SPEC-011 | Notification center, preferences, dedup ve retry seam | Hazır; executable slice var |
| SPEC-012 | Privacy, account deletion, audit ve release operations | Hazır; executable slice var |

Spec’ler ürün gereksinimlerinin canonical kaynağıdır. Bu rehber spec’lerin kısa
birleştirilmiş görünümüdür; çelişki varsa ilgili spec ve açık kullanıcı kararı
önceliklidir.

## 5. Mimari ve veri sınırları

MVP tek deploy edilebilir modüler monolith olarak tutulur. Modüller iş sınırları
ile ayrılır: identity, patient, directory, discovery, inquiry/lead, messaging,
files, quote, appointment/journey, notification, privacy ve audit/operations.

Hedef production stack:

- Node 22 LTS + TypeScript
- NestJS 11 + Fastify 5
- PostgreSQL + Prisma 6
- Firebase Authentication: Google, Apple ve email/password
- Redis + BullMQ
- Docker + Dokploy
- Pino JSON, self-hosted collector, Loki/Grafana ve PostgreSQL audit

Public discovery ile private patient/lead verisi ayrı projection ve yetki
kontrolleriyle korunur. Kimliği doğrulanmış olmak tek başına erişim hakkı
vermez; rol, kuruluş üyeliği, sahiplik/atama, grant ve kaynak state’i birlikte
kontrol edilir.

## 6. Mevcut uygulama ile production farkı

Şu an çalışan backend local/test doğrulaması için in-memory store kullanır.
Aşağıdaki parçalar henüz gerçek provider değildir:

- PostgreSQL/Prisma schema, migration ve persistence
- Firebase token validation, kısa cache ve abuse controls
- Private S3/R2/MinIO storage, malware scanner ve signed access
- BullMQ/Redis worker, outbox ve dead-letter runtime
- Email/push provider teslimi
- Docker/Dokploy/OpenBao deployment
- Backup/PITR restore tatbikatı ve Loki/Grafana operasyon kurulumu
- Hasta, klinik ve süper admin UI

Bu nedenle local test veya smoke başarısı production readiness olarak raporlanmaz.

## 7. MVP kabul ölçütleri

MVP tamamlanmış sayılmadan önce en az şu davranışlar hedefli test ve uygun
browser testiyle doğrulanmalıdır:

1. Hasta doğrulanmış public kayıtları keşfedebilir.
2. Hasta en fazla üç kuruluşa izole lead oluşturarak talep gönderebilir.
3. Klinik yalnız yetkili olduğu ve paylaşılmış kaynakları görebilir.
4. Mesaj düzenlemeleri kalıcı revision oluşturur; görünürlük kuralları korunur.
5. Screening iletişim bilgisi kaçınmalarını deterministik olarak işaretler.
6. Dosya erişimi grant ve aktör yetkisi olmadan açılamaz.
7. Teklif, randevu ve bildirim geçişleri idempotent ve yetkili çalışır.
8. Privacy/anonymization ve audit kayıtları hassas içeriği loglamadan çalışır.
9. Production provider’ları bağlanmadan önce in-memory seam’ler açıkça ayrıştırılır.
10. Concierge ve AI akışları MVP’ye yanlışlıkla eklenmez.

## 8. Sıradaki uygulama sırası

1. In-memory adapter ile hedefli testleri koru.
2. PostgreSQL/Prisma schema ve migration sınırını SPEC-002–007 ile bağla.
3. Firebase auth ve gerçek authorization policy’sini local actor adapter’dan ayır.
4. Private storage, queue/outbox ve notification provider seam’lerini bağla.
5. UI oluşturulduğunda Playwright ile hasta, klinik ve admin akışlarını gerçek
   tarayıcıda test et.
6. Her provider geçişinden sonra ilgili pakette hedefli test, smoke ve release
   gate çalıştır.

## Referans dosyalar

- Kısa ürün özeti: `docs/mvp-kisa-ozet.md`
- Tarihli proje planı: `docs/mvp-project-plan.md`
- Spec roadmap: `docs/spec-roadmap.md`
- Ürün context’i: `docs/project-overview.md`
- Mimari: `docs/architecture.md`
- İlerleme: `docs/progress-tracker.md`
