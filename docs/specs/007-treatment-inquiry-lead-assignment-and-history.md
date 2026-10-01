# SPEC-007 — Tedavi Talebi, Lead Atama ve Durum Geçmişi

- **Durum:** Accepted — grouped decision gate tamamlandı; implementation başlamadı
- **Tarih:** 1 Ekim 2026
- **Tür:** Treatment inquiry, per-organization lead, assignment and state-history specification
- **Bağımlılık:** SPEC-002–006
- **Uygulama durumu:** Başlanmadı
- **Routing:** Bir Inquiry altında en fazla 3 seçili organization Lead’i
- **Sharing:** Explicit access grant; recipient-specific consent snapshot yok
- **Concurrency:** Append-only timeline + optimistic version
- **Follow-up:** 7 gün inactivity; iki tarafa YES/NO

## 1. Amaç

Bu spec; authenticated Patient’ın yapılandırılmış treatment inquiry oluşturmasını, en fazla üç published/verified organization seçmesini, her organization için izole Lead ve assignment oluşturulmasını, explicit field/attachment share grant’lerini, ayrı Inquiry/Lead state machine’lerini ve append-only timeline’ı tanımlar.

Amaç; birden çok kuruluşla görüşmeyi veri sızıntısı olmadan izole etmek, her state değişimini aktör ve sürümle kanıtlamak ve 7 günlük hareketsizlikte hasta ile kuruluştan ayrı YES/NO sonucu toplamaktır.

## 2. Kapsam

### 2.1 Kapsam içinde

- Patient-owned Inquiry draft/submit/cancel/close akışı.
- Bir Inquiry için en fazla üç seçili organization.
- Organization başına ayrı Lead ve LeadAssignment.
- Structured minimum intake + optional detail.
- Explicit `LeadAccessGrant` ile field/attachment paylaşımı.
- Güncel SPEC-003 general consent kontrolü; recipient-specific consent snapshot yok.
- Inquiry ve Lead için ayrı state machine.
- Organization accept/decline; patient cancel/revoke; super admin revoke/reassign.
- Append-only timeline ve optimistic concurrency.
- Create/assign/transition idempotency.
- 7 gün inactivity sonrası iki tarafa YES/NO follow-up.
- Çelişkili/cevapsız follow-up için super admin review.

### 2.2 Kapsam dışında

- Attachment upload/storage/scan; SPEC-008.
- Quote lifecycle; SPEC-009.
- Appointment ve treatment journey; SPEC-010.
- Notification provider/outbox/delivery; SPEC-011.
- Retention ve legal deletion/anonymization; SPEC-012.
- Otomatik AI eşleştirme veya lead scoring.
- Dörtten fazla organization’a broadcast veya organization’ların birbirini görmesi.

## 3. Kabul edilmiş kararlar

| Karar | Accepted seçim | Sınır / not |
| --- | --- | --- |
| Routing | Bir Inquiry → en fazla 3 organization Lead’i | Her Lead organization bazında izole |
| Organization seçimi | Patient seçer | Yalnız published + verified + active organization |
| Intake | Structured minimum + optional detail | Health detail profile’a değil Inquiry’ye |
| Sharing | Explicit access grant | Consent snapshot yok; güncel consent + grant her read’de kontrol |
| Inquiry state | draft/submitted/active/closed/cancelled | Server-side policy |
| Lead state | new/accepted/in_discussion/awaiting_patient/qualified/closed_won/closed_lost/revoked | Quote/appointment state’i ayrı spec’lerde |
| Assignment | Organization accept/decline | Super admin gerekçeyle revoke/reassign edebilir |
| Follow-up | 7 gün; hasta + organization YES/NO | Conflict/cevapsızlık admin review |
| History | Append-only timeline | Actor/from/to/reason/time/request/version |
| Concurrency | Optimistic version | Stale transition `409` |
| Idempotency | Create/assign/transition | Duplicate Lead veya event üretmez |

## 4. Aktör ve yetki matrisi

| Aktör | Inquiry | Lead/assignment | Share grant | Timeline/follow-up |
| --- | --- | --- | --- | --- |
| Patient | Kendi draft’ını oluşturur, submit/cancel/close eder | En fazla 3 organization seçer; kendi Lead özetini görür | Field/attachment grant verir ve revoke eder | Kendi timeline’ını görür; YES/NO yanıtlar |
| Organization owner/admin/editor | Kendi organization’a atanmış Inquiry projection’ını görür | Assignment accept/decline; izinli Lead transition’ları | Yalnız grant kapsamını okur | Kendi Lead timeline’ını görür; YES/NO yanıtlar |
| Organization viewer | Read-only projection | Mutasyon yapamaz | Yalnız policy izinli projection | Read-only timeline |
| Super admin | Bütün Inquiry/Lead kayıtlarını görebilir | Gerekçeyle revoke/reassign; conflict review | Policy/audit görünümü | Bütün timeline/follow-up ve review kararları |
| System worker | Mutasyon policy’siyle inactivity hesaplar | Assignment/follow-up job çalıştırır | Grant bypass edemez | İdempotent follow-up/review event üretir |

Organization actor erişimi active membership + capability + exact LeadAssignment + current grant ile doğrulanır. Client’tan gelen organization ID yetki kanıtı değildir.

## 5. Inquiry intake

### 5.1 Structured minimum

Inquiry submit için minimum alanlar:

- patient ID; authenticated context’ten
- canonical treatment ID
- target country ve optional city/location preference
- expectation/summary; bounded text
- preferred language; BCP 47
- desired date range veya flexible flag
- selected organization IDs; 1–3 adet
- general consent current-state check

### 5.2 Optional detail

- budget range ve ISO 4217 currency
- additional bounded detail
- attachment references
- contact preference reference

Diagnosis, medication, allergy veya başka health detail eklenirse Inquiry’nin hassas alanı olarak sınıflandırılır; PatientProfile’a kopyalanmaz. Structured field, enum, length, date range ve cross-field validation zorunludur.

### 5.3 Organization eligibility

Submit anında seçilen her organization:

- published
- verified ve expiry geçerli
- active
- selected treatment ile uygun public association’a sahip

olmalıdır. Eligibility sonradan kaybolursa mevcut Lead public/private policy’ye göre suspended/revoked review akışına girer; yeni erişim synchronous guard ile kesilir.

## 6. Routing ve organization izolasyonu

### 6.1 Inquiry–Lead ilişkisi

- Tek Inquiry Patient’a aittir.
- Her seçili organization için ayrı Lead ve LeadAssignment oluşturulur.
- Maximum üç distinct organization; duplicate organization reddedilir.
- Organization A, Organization B/C Lead, message, quote, assignment, timeline veya grant verisini göremez.
- Patient kendi Inquiry altındaki Lead özetlerini birlikte görebilir.
- Organization sayısı sonradan artırılırsa toplam üç sınırı korunur ve yeni assignment ayrı idempotent işlem olur.

### 6.2 Atomic submit

Inquiry submit, initial Inquiry timeline ve seçili organization Lead/Assignment kayıtları güvenilir transaction/outbox sınırında oluşturulur. Partial submit sessiz başarı vermez. Bir organization eligibility kontrolü başarısızsa bütün submit reddedilir veya açıkça tanımlı partial-result contract gerekir; MVP baseline all-or-nothing’dır.

## 7. Explicit access grant

### 7.1 Consent ile ilişki

- SPEC-003 GeneralConsentRecord güncel ve accepted olmalıdır.
- Recipient-specific immutable consent snapshot oluşturulmaz.
- Patient organization seçerken explicit access grant oluşturur.
- Her organization read isteği güncel general consent + active grant + assignment + membership kontrollerinden geçer.

### 7.2 Grant kapsamı

`LeadAccessGrant` minimum olarak:

- inquiry/lead ID
- patient ID ve recipient organization ID
- allowed field set veya projection policy version
- attachment reference allowlist
- granted/revoked timestamps
- actor, reason, request ID ve version

bilgilerini taşır.

### 7.3 Revoke

- Patient grant’i revoke edebilir.
- Revoke yeni profile/inquiry field ve attachment read erişimini durdurur.
- Revoke geçmiş audit, message, delivery veya legal record’u sessizce silmez.
- Organization’ın daha önce görüntülediği/verilmiş verinin harici kopyasını teknik olarak geri alamaz; ürün erişimi ve yeni delivery kesilir.
- Revoke Lead’i `revoked` veya review-required state’e geçirir; exact transition current state policy’sine uyar.

## 8. Inquiry state machine

### 8.1 State’ler

- `draft`: Patient düzenliyor; organization erişimi yok.
- `submitted`: Intake/grant doğrulandı, initial Lead/Assignment kayıtları oluştu.
- `active`: En az bir Lead accepted/in_discussion/awaiting_patient/qualified durumda.
- `closed`: Tüm organization Lead’leri terminal ve Inquiry sonuçlandırıldı.
- `cancelled`: Patient submit öncesi veya policy izinli aşamada iptal etti; yeni erişim/assignment yok.

### 8.2 Temel geçişler

- `draft → submitted | cancelled`
- `submitted → active | closed | cancelled`
- `active → closed | cancelled`

Inquiry state child Lead’lerden server-side türetilebilir; client doğrudan arbitrary state yazamaz. Terminal state’ten reopen yalnız ayrı audited admin/product policy ile mümkündür; MVP’de default yoktur.

## 9. Lead ve assignment state machine

### 9.1 Assignment state

- `pending`: Lead/assignment oluşturuldu, organization yanıtlamadı.
- `accepted`: Yetkili organization actor kabul etti.
- `declined`: Organization gerekçeyle reddetti.
- `revoked`: Patient grant/cancel veya super admin kararıyla erişim kapandı.
- `reassigned`: Super admin gerekçeyle yeni organization/assignment akışı başlattı; eski assignment terminal kalır.

### 9.2 Lead state

- `new`: Assignment pending veya yeni oluşturuldu.
- `accepted`: Organization assignment’ı kabul etti.
- `in_discussion`: Yetkili iletişim/mesaj akışı başladı.
- `awaiting_patient`: Patient aksiyonu/bilgisi bekleniyor.
- `qualified`: Organization tarafından gerçek fırsat/treatment fit olarak işaretlendi.
- `closed_won`: Treatment süreci/sonucu olumlu kabul edildi.
- `closed_lost`: Olumsuz sonuç veya fırsat kaybı.
- `revoked`: Share/assignment erişimi geri alındı.

### 9.3 Transition sahipleri

- Organization owner/admin/editor: `new → accepted`, `accepted → in_discussion`, `in_discussion ↔ awaiting_patient`, `in_discussion/awaiting_patient → qualified`, izinli terminal sonuç önerileri.
- Patient: Inquiry cancel, grant revoke, follow-up outcome ve kendi aksiyonları; organization adına qualified/accepted yazamaz.
- Super admin: Gerekçeli revoke/reassign, conflict çözümü ve terminal outcome düzeltmesi; her işlem audit edilir.
- System worker: Yalnız policy-defined inactivity/follow-up event; human state’i keyfi değiştiremez.

Quote/appointment event’leri ileride Lead timeline’a reference olabilir; kendi aggregate state’leri SPEC-009/010’dadır.

## 10. Append-only timeline ve concurrency

### 10.1 Timeline event

Her Inquiry/Lead transition append-only event üretir:

- event ID, inquiry/lead ID
- actor type/ID veya system context
- from/to state
- reason code ve optional bounded note
- occurredAt, request ID
- aggregate version
- related assignment/follow-up/quote reference

Geçmiş event overwrite veya delete edilmez. Correction yeni compensating/admin event üretir.

### 10.2 Optimistic version

- Her mutasyon `expectedVersion` taşır.
- Stale version `409 Conflict` üretir.
- Transition guard current state, actor capability, membership, grant ve child state’leri birlikte kontrol eder.
- Aynı idempotency key + aynı payload aynı sonucu döndürür.
- Aynı key + farklı payload `409` üretir.
- Retry duplicate Lead, Assignment veya timeline event oluşturmaz.

## 11. Hareketsizlik ve follow-up

### 11.1 Meaningful activity

Meaningful activity candidate’ları:

- assignment accept/decline
- Lead state transition
- authorized message oluşturma
- requested patient information update
- quote/appointment reference event’i; ilgili spec’ler hazır olduğunda
- follow-up response

Salt read/view, retry veya teknik job heartbeat inactivity saatini resetlemez.

### 11.2 7 günlük baseline

Lead `accepted`, `in_discussion` veya `awaiting_patient` durumunda 7 gün meaningful activity yoksa Patient ve organization için tek açık follow-up cycle oluşturulur.

- Her taraf `YES` veya `NO` ve optional bounded note verir.
- `YES/YES` olumlu sonuç adayı; Lead state policy’siyle terminal/qualified review’a gider.
- `NO/NO` olumsuz sonuç adayıdır.
- `YES/NO` veya `NO/YES` conflict flag + super admin review üretir.
- İki tarafın da sürede cevap vermemesi super admin review üretir.
- Tek tarafın yanıtı diğer taraf için reminder/review policy’sine girer.

Follow-up yaratma/yanıtlama idempotent’tir; aynı cycle duplicate açık task üretmez. Notification delivery SPEC-011’dedir.

## 12. Reassign ve revoke

- Patient en fazla üç organization sınırı içinde yeni organization ekleyebilir; mevcut terminal assignment geçmişi korunur.
- Super admin reassign için reason zorunlu tutar; eski assignment `reassigned`/terminal olur, erişimi devam etmez.
- Reassign yeni organization’a eski organization’ın message/quote/timeline içeriğini açmaz.
- Shared field/attachment grant yeni recipient için ayrıca oluşturulur.
- Organization eligibility kaybı, membership suspension veya verification expiry access review/revoke tetikler.
- Revoke/reassign audit ve timeline event’lerini aynı güvenilir sonuçta üretir.

## 13. API işlem grupları

Exact endpoint isimleri implementation kaydında sabitlenmek üzere:

| İşlem | Aktör | Beklenen sonuç | Durum |
| --- | --- | --- | --- |
| Inquiry draft oluştur/güncelle | Patient | Validated draft + version | Accepted |
| Inquiry submit et | Patient | Inquiry + 1–3 Lead/Assignment + grant + timeline | Accepted |
| Kendi Inquiry/Lead’lerini listele/getir | Patient | Private cursor page/detail | Accepted |
| Organization Lead’lerini listele/getir | Active member | Yalnız assignment + grant projection | Accepted |
| Assignment accept/decline | Owner/admin/editor | Assignment/Lead transition + timeline | Accepted |
| Lead transition yap | Yetkili actor | Versioned state + append-only event | Accepted |
| Grant revoke/güncelle | Patient | Future access policy + timeline/audit | Accepted |
| Revoke/reassign | Super admin | Gerekçeli terminal/new assignment sonucu | Accepted |
| Follow-up üret/yanıtla | Worker/Patient/organization | Idempotent cycle/outcome/conflict | Accepted |
| Timeline getir | Yetkili actor/super admin | Scope’lu cursor page | Accepted |

Tüm işlemler `/api/v1`, UUID, Zod, cursor pagination, RFC 9457, request ID ve audit foundation kurallarına uyar.

## 14. Veri modeli

| Entity | Sorumluluk | Ana invariant |
| --- | --- | --- |
| `Inquiry` | Patient-owned treatment request | En fazla 3 distinct organization Lead’i |
| `InquiryDetail` | Structured/optional intake | Health detail PatientProfile’a kopyalanmaz |
| `Lead` | Organization-specific opportunity | Tek Inquiry + tek organization scope |
| `LeadAssignment` | Lead’in organization acceptance/access state’i | Active membership/capability zorunlu |
| `LeadAccessGrant` | Explicit field/attachment share | General consent + current grant her read’de |
| `InquiryTimelineEvent` | Append-only inquiry state/history | Event overwrite/delete yok |
| `LeadTimelineEvent` | Append-only lead state/history | Actor/from/to/reason/version zorunlu |
| `LeadFollowUpCycle` | 7 günlük iki taraflı YES/NO sorgusu | Lead başına tek açık cycle |
| `LeadOutcomeDeclaration` | Patient/organization result | Actor başına cycle’da tek current declaration/history |
| `LeadConflictReview` | Çelişki/cevapsızlık admin review | Admin decision/reason audit edilir |

## 15. Validation, transaction ve hata kuralları

- Inquiry intake, organization selection, grant, assignment ve transition payload’ları ayrı Zod schema’larıyla doğrulanır.
- Selected organization count 1–3; duplicate ID reddedilir.
- Treatment/organization eligibility submit ve access anında doğrulanır.
- Date range, budget min/max/currency, language, text length ve attachment reference cross-field validation’dan geçer.
- Submit all-or-nothing transaction/outbox sonucu üretir.
- Assignment accept/decline + Lead state + timeline aynı güvenilir sonuçta tamamlanır.
- Grant revoke + access state + timeline/audit aynı güvenilir sonuçta tamamlanır.
- Stale expectedVersion `409`; invalid transition `409` veya domain `422`; unauthorized/hidden resource `403/404` policy’sine uyar.
- Max organization sınırı veya ineligible organization validation/conflict error üretir.
- Provider/job failure patient data veya internal state açmadan dependency-unavailable error’a çevrilir.

## 16. Audit, log ve privacy

Audit edilmesi gerekenler:

- Inquiry create/update/submit/cancel/close
- organization select/add/remove
- Lead/Assignment create, accept, decline, revoke, reassign
- access grant create/update/revoke
- state transition/correction
- follow-up create/response/conflict/review
- super admin read/override/reassign/decision

Teknik loglar expectation/health detail, budget, attachment, message, follow-up note veya raw grant payload taşımaz. Güvenli metadata: request ID, pseudonymous actor, inquiry/lead/organization IDs, transition code, duration ve error code.

Organization’lar birbirinin Lead/timeline/grant/follow-up verisini hiçbir response, event, cache veya log projection’ında göremez.

## 17. Kabul kriterleri

1. Tek Inquiry altında en fazla üç distinct organization Lead’i oluşturulur.
2. Her Lead ve assignment organization bazında izoledir.
3. Submit yalnız published, verified, active ve treatment-eligible organization kabul eder.
4. Intake structured minimum ve optional detail sınırını uygular; health detail profile’a yazılmaz.
5. General consent güncel olmalı; recipient-specific consent snapshot oluşturulmaz.
6. Explicit grant field/attachment scope taşır ve her organization read’de kontrol edilir.
7. Grant revoke yeni erişimi durdurur; geçmiş audit/legal kaydı silmez.
8. Inquiry draft/submitted/active/closed/cancelled state’lerini kullanır.
9. Lead new/accepted/in_discussion/awaiting_patient/qualified/closed_won/closed_lost/revoked state’lerini kullanır.
10. Patient organization seçer; organization accept/decline eder; super admin gerekçeyle revoke/reassign eder.
11. Her transition append-only timeline event üretir.
12. ExpectedVersion zorunludur; stale transition `409` üretir.
13. Create/submit/assign/transition/follow-up işlemleri idempotent’tir.
14. Submit Lead/Assignment/grant/timeline kayıtlarını all-or-nothing güvenilir sonuçta oluşturur.
15. Yedi gün meaningful inactivity iki tarafa YES/NO follow-up üretir.
16. Çelişkili cevap veya iki tarafın cevapsızlığı super admin review üretir.
17. Organization A, başka organization Lead/message/timeline/grant verisini göremez.
18. Reassign eski organization erişimini sürdürmez ve yeni recipient için ayrı grant gerektirir.
19. Bütün kritik mutasyonlar actor, target, reason, request ID, time ve version ile audit edilir.
20. Bu spec uygulama kodu, schema, migration, file storage, quote, appointment veya notification provider içermez.

## 18. Bağımlılıklar

- SPEC-001: Conversation/message, follow-up YES/NO, conflict review ve deterministic screening.
- SPEC-002: PostgreSQL/Prisma, UUID/Zod, RFC 9457, idempotency, transaction/outbox, BullMQ ve audit foundation.
- SPEC-003: Firebase actor, general consent, organization membership ve capability policy.
- SPEC-004: Patient profile completion, private projection ve explicit share boundary.
- SPEC-005: Eligible organization/treatment, publication/verification ve owner/admin/editor/viewer capability.
- SPEC-006: Discovery’den selected organization/treatment reference.
- SPEC-008: Attachment reference, ownership ve private access.
- SPEC-009/010: Quote/appointment/treatment journey reference event’leri.
- SPEC-011: Follow-up ve assignment notification delivery.
- SPEC-012: Inquiry/Lead/grant/timeline retention ve anonymization.

## 19. Implementation kayıtları

SPEC-007 ürün ve state-machine kararları kapatılmıştır. Implementation’da:

1. Exact intake schema, text/list/date/budget validation limits ve `ready_for_inquiry` field seti.
2. Inquiry/Lead/Assignment transition guard matrix ve terminal/reopen policy.
3. Access grant field catalog, attachment scope ve revoke projection behavior.
4. Meaningful activity event catalog ve 7 günlük scheduler query/index planı.
5. Follow-up response window, reminder count ve admin review SLA.
6. Exact endpoint names, DTO projections, cursor fields ve idempotency scope.

## 20. Doğrulama planı

Implementation yapıldığında:

1. Patient 1–3 eligible organization ile Inquiry submit eder; her biri için izole Lead/Assignment/grant/timeline oluşur.
2. Dördüncü veya duplicate organization reddedilir.
3. Ineligible/unpublished/expired organization submit’i all-or-nothing reddeder.
4. Organization yalnız kendi assignment ve grant projection’ını görür; diğer organization verisi sızmaz.
5. Organization assignment accept/decline eder ve doğru Lead/timeline transition oluşur.
6. Stale expectedVersion state’i değiştirmez ve `409` üretir.
7. Aynı idempotency key retry duplicate Lead/Assignment/event oluşturmaz; farklı payload conflict üretir.
8. Grant revoke sonrası yeni profile/inquiry/attachment read erişimi kapanır.
9. Reassign eski assignment erişimini keser ve yeni organization için ayrı grant oluşturur.
10. Yedi gün meaningful activity olmadan iki taraf için tek follow-up cycle oluşur.
11. YES/NO conflict ve iki tarafın cevapsızlığı admin review’a düşer.
12. Timeline append-only kalır; admin correction geçmiş event’i overwrite etmez.
13. Raw health detail, attachment, expectation veya follow-up note teknik loglara yazılmaz.
