# SPEC-001 — Mesaj Yönetişimi, Deterministik Denetim ve Lead Follow-up

- **Durum:** Accepted — kullanıcı tarafından açıkça oluşturulması istendi
- **Tarih:** 1 Ekim 2026
- **Tür:** Backend feature specification
- **Uygulama durumu:** Başlanmadı
- **Mimari:** Modüler monolith — Accepted

## 1. Amaç

Hasta ile hastane/klinik temsilcisi arasındaki mesajlaşmayı kalıcı, denetlenebilir ve kullanıcılar açısından anlaşılır hale getirmek; açık veya gizlenmiş iletişim bilgisi paylaşımını AI kullanmadan deterministik kurallarla işaretlemek; şikâyet/destek ve lead follow-up süreçlerini süper admin denetimine bağlamak.

Bu spec mesaj içeriğini otomatik silmez veya yaptırım uygulamaz. Sistem mesajı kaydeder, kural eşleşmesini flag’e dönüştürür ve süper admin incelemesine sunar.

## 2. Kabul edilmiş ürün kararları

1. Mesaj silme yoktur; yalnız düzenleme vardır.
2. Her düzenleme kalıcı bir revision oluşturur.
3. Konuşan hasta ve klinik temsilcisi yalnız mesajın güncel halini ve düzenlendi bilgisini görür.
4. Eski mesaj içeriklerini yalnız süper admin görür.
5. Süper admin bütün konuşmaları ve bütün revision’ları her zaman okuyabilir.
6. Süper admin erişimi ve yaptığı denetim işlemleri audit edilir.
7. Mevcut MVP’de AI/model tabanlı mesaj analizi yoktur.
8. Denetim; anahtar kelime, düz/gizlenmiş telefon numarası, boşluk veya işaretlerle bölünmüş numara, Unicode rakamları ve rakamların yazıyla/hecelenerek verilmesi gibi kaçınma biçimlerini deterministik kurallarla ele alır.
9. Lead follow-up bulunur ve en az Evet/Hayır sonucu destekler.
10. Konuşma bağlamında şikâyet ve destek kaydı açılabilir.
11. Süper admin seçtiği kuruluşa denetim kaydı bildirimi gönderip göndermeyeceğini Evet/Hayır olarak belirleyebilir.
12. Concierge bu MVP ve bu spec kapsamında değildir.

## 3. Aktörler

| Aktör | Yetki |
| --- | --- |
| Hasta | Katılımcısı olduğu konuşmalarda mesaj gönderir/düzenler; yalnız güncel mesajları görür; şikâyet/destek kaydı açar; kendisine yöneltilen follow-up’a cevap verir |
| Klinik/hastane temsilcisi | Kuruluşuna atanmış lead konuşmalarında aynı katılımcı işlemlerini yapar; kuruluşuna yöneltilen follow-up’a cevap verir |
| Süper admin | Bütün konuşmaları, güncel mesajları ve tüm revision geçmişini her zaman görür; flag/case/follow-up inceler; karar verir; seçilen kuruluşa denetim bildirimi gönderir |
| Sistem worker’ı | Mesaj/revision taraması, hareketsiz lead follow-up üretimi ve bildirim teslimini yetkili sistem context’iyle çalıştırır |

## 4. Kapsam

### 4.1 Mesaj oluşturma

- Yetkili konuşma katılımcısı metin mesajı oluşturabilir.
- Her mesaj değişmez bir message ID, conversation ID, sender ID, server timestamp ve revision numarasıyla kaydedilir.
- Tekrarlanan client request ID aynı konuşmada ikinci mesaj üretmez.
- Mesaj başarıyla kaydedildikten sonra deterministik denetim aynı revision üzerinde çalışır.

### 4.2 Mesaj düzenleme ve revision

- Yalnız mesajın sahibi düzenleme yapabilir; süper admin ürün davranışı olarak mesaj metnini değiştirmez.
- İstek beklenen güncel revision numarasını taşır.
- Stale revision ile düzenleme `conflict` sonucudur.
- Başarılı düzenleme tek transaction içinde:
  1. Önceki içeriği kaybetmeden yeni `MessageRevision` oluşturur.
  2. Mesajın güncel içeriğini ve revision numarasını günceller.
  3. Audit event üretir.
  4. Yeni revision’ı deterministik denetime hazırlar.
- Revision kaydı en az message ID, revision sıra numarası, eski içerik, yeni içerik, düzenleyen aktör ve zaman bilgisini korur.
- Düzenleme zaman penceresi ve maksimum düzenleme sayısı henüz Unknown’dur; implementation öncesi karara bağlanmalıdır.

### 4.3 Revision görünürlüğü

- Hasta ve klinik temsilcisi response/event içinde yalnız güncel mesaj içeriğini alır.
- Katılımcı görünümünde `edited`, current revision ve son düzenleme zamanı bulunabilir.
- Katılımcıya eski içerik, revision diff’i veya revision endpoint’i sunulmaz.
- Süper admin message veya conversation bazında bütün revision’ları kronolojik görebilir.
- Süper admin revision görünümü eski/yeni içerik, düzenleyen aktör ve zamanı açıkça gösterir.
- Her süper admin conversation/revision okuması audit edilir.

### 4.4 Deterministik mesaj denetimi

#### Orijinal ve normalize edilmiş görünüm

- Kullanıcının orijinal mesajı değişmeden saklanır.
- Denetim yalnız ayrı, tekrar üretilebilir normalize edilmiş görünüm üzerinde çalışır.
- Normalizasyon pipeline’ı sürümlüdür; bir flag hangi pipeline/rule sürümüyle üretildiğini taşır.

#### Minimum normalizasyon adımları

1. Unicode normalization.
2. Locale-aware küçük harf/case folding.
3. Arabic-Indic ve diğer Unicode decimal rakamlarını ortak `0–9` formuna dönüştürme.
4. Telefon/iletişim tespiti için whitespace, tire, nokta, parantez ve benzeri ayırıcıları normalize etme.
5. Bitişik ve ayrık sayı token’larını kontrollü pencere içinde birleştirme.
6. Yapılandırılmış sözlükle rakamları yazıyla verme biçimlerini sayısal forma dönüştürme.
7. Heceye veya karakter gruplarına bölünmüş sayı/anahtar kelime biçimlerini kontrollü biçimde birleştirme.
8. Keyword, phone-like sequence, URL, e-posta, IBAN ve platform dışı iletişim pattern’lerini sürümlü kurallarla eşleştirme.

#### Başlangıç risk kategorileri

- `CONTACT_PHONE`
- `CONTACT_EMAIL`
- `EXTERNAL_CHANNEL`
- `EXTERNAL_URL`
- `PAYMENT_OR_IBAN`
- `OBFUSCATED_CONTACT`
- `SPAM_OR_ABUSE`
- `OTHER_CONFIGURED_KEYWORD`

İlk desteklenecek sayı kelimesi dilleri ve kesin rule set’i açık sorudur. Kurallar hard-coded dağınık regex’ler yerine merkezî, sürümlü rule tanımları olmalıdır.

#### Eşleşme sonucu

- Eşleşme `RiskFlag` üretir; mesaj silinmez.
- Flag en az message/revision ID, conversation ID, organization ID, rule ID/version, kategori, oluşturma zamanı ve maskelenmiş kanıt taşır.
- Ham mesaj veya normalize edilmiş tam metin teknik loga yazılmaz.
- Aynı message revision + rule için duplicate açık flag üretilmez.
- Yeni revision yeniden taranır; eski revision’ın flag/audit izi korunur.
- Yanlış pozitif, doğrulandı veya kapandı kararları süper admin tarafından verilir.

### 4.5 Süper admin incelemesi

- Süper admin flag kuyruğunu durum, kuruluş, kural, kategori ve tarihle filtreleyebilir.
- Flag detayından konuşmanın güncel mesajlarını ve revision geçmişini görebilir.
- Karar seçenekleri en az `CONFIRMED`, `FALSE_POSITIVE`, `RESOLVED` durumlarını destekler; kesin enum implementation spec aşamasında dondurulur.
- Karar, gerekçe, aktör ve zaman audit edilir.
- Bu spec otomatik hesap engelleme veya otomatik mesaj bekletme uygulamaz.

### 4.6 Şikâyet ve destek

- Hasta veya klinik temsilcisi katılımcısı olduğu conversation/message/lead için `COMPLAINT` veya `SUPPORT` kaydı açabilir.
- Case; tür, kategori, açıklama, açan aktör, organization, ilgili entity referansları, durum ve zaman taşır.
- Süper admin case detayında ilişkili konuşmayı ve bütün revision’ları görebilir.
- Case oluşturma, atama, durum değişikliği, çözüm ve kuruluş bildirimi audit edilir.
- Minimum durumlar: `OPEN`, `IN_REVIEW`, `RESOLVED`, `CLOSED`; kesin geçiş matrisi implementation öncesi dondurulmalıdır.

### 4.7 Lead follow-up

- Belirlenen hareketsizlik eşiğini aşan lead için follow-up kaydı üretilebilir.
- Follow-up hasta, klinik veya iki tarafa yöneltilebilir; hedef ve kanal henüz Unknown’dur.
- Minimum cevap `YES` / `NO` ve opsiyonel kısa nottur.
- Hasta ve klinik cevapları çelişirse follow-up admin incelemesine düşer.
- Cevapsız veya süresi geçen follow-up admin kuyruğunda görünür.
- Follow-up oluşturma, gönderim, cevap ve admin kararı audit edilir.

### 4.8 Seçilen kuruluşa denetim bildirimi

- Süper admin bir flag veya şikâyet/destek kaydını seçilen organization’a bildirebilir.
- İşlem açık `sendNotice: YES/NO` kararı gerektirir.
- `NO` seçilirse dış bildirim oluşturulmaz; karar audit edilir.
- `YES` seçilirse hedef organization ID zorunludur ve yalnız yetkili kuruluş seçilebilir.
- Bildirim güvenli bir özet, ilgili message/conversation referansı, kategori ve beklenen aksiyonu taşıyabilir.
- Eski revision içerikleri kuruluş bildirimine otomatik eklenmez; revision geçmişi süper admin-only kalır.
- Aynı flag/case, organization ve karar için retry duplicate bildirim üretmez.
- Gönderim denemeleri ve teslim sonucu audit edilir.
- Teslim kanalı — uygulama içi, e-posta veya başka kanal — implementation öncesi seçilmelidir.

## 5. Kavramsal veri modeli

| Varlık | Zorunlu sorumluluk |
| --- | --- |
| `Conversation` | Katılımcılar, organization/lead bağlamı ve aktiflik |
| `Message` | Güncel içerik, sender, current revision, created/edited timestamps |
| `MessageRevision` | Eski/yeni içerik, sıra, düzenleyen, zaman |
| `ScreeningRule` | Kategori, pattern/sözlük, dil, sürüm, aktiflik |
| `RiskFlag` | Rule ve message revision eşleşmesi, durum ve admin kararı |
| `ComplaintSupportCase` | Tür, açan aktör, entity referansları, durum ve çözüm |
| `FollowUp` | Lead, hedef taraf, due time, YES/NO cevapları, conflict durumu |
| `OrganizationNotice` | Kaynak flag/case, hedef organization, send kararı ve teslim durumu |
| `AuditEvent` | Aktör, action, entity/revision referansı, zaman, request ID ve güvenli metadata |

Fiziksel tablo, index ve migration bu spec’in kapsamında değildir.

## 6. API işlem sözleşmesi

Endpoint yolları framework ve API biçimi kesinleşmediği için isimlendirilmez. Uygulama en az şu işlemleri sağlamalıdır:

1. Mesaj oluştur.
2. Mesaj düzenle.
3. Katılımcı için güncel mesaj geçmişini listele.
4. Süper admin için tüm konuşmaları listele.
5. Süper admin için revision geçmişini getir.
6. Screening rule listele/oluştur/güncelle/aktiflik değiştir.
7. Risk flag listele/detay/karar ver.
8. Şikâyet veya destek kaydı aç.
9. Case listele/detay/durum/çözüm güncelle.
10. Follow-up oluştur veya sistem tarafından üret.
11. Follow-up’a YES/NO yanıt ver.
12. Seçilen kuruluşa denetim bildirimi gönderme kararını kaydet.
13. Bildirim teslim durumunu getir/yeniden dene.
14. İlgili audit geçmişini listele.

## 7. Yetkilendirme matrisi

| İşlem | Hasta | Klinik temsilcisi | Süper admin | Sistem worker’ı |
| --- | --- | --- | --- | --- |
| Kendi conversation’ında mesaj gönder/düzenle | Evet | Evet | Hayır | Hayır |
| Güncel mesajları gör | Kendi conversation’ı | Kuruluşuna atanmış conversation | Tümü | İş gereği sınırlı |
| Revision içeriğini gör | Hayır | Hayır | Tümü | Denetim işi için ilgili revision |
| Risk flag gör/karar ver | Hayır | Hayır | Evet | Yalnız üretir |
| Complaint/support aç | Evet | Evet | Gerekmez | Hayır |
| Case yönet | Hayır | Hayır | Evet | Hayır |
| Follow-up yanıtla | Kendisine yöneltilen | Kuruluşuna yöneltilen | Hayır | Hayır |
| Organization notice gönder | Hayır | Hayır | Evet | Yalnız teslim eder |
| Audit oku | Hayır | Hayır | Evet | Hayır |

## 8. Audit olayları

En az şu olaylar audit edilmelidir:

- `MESSAGE_CREATED`
- `MESSAGE_EDITED`
- `ADMIN_CONVERSATION_VIEWED`
- `ADMIN_REVISIONS_VIEWED`
- `RISK_FLAG_CREATED`
- `RISK_FLAG_DECIDED`
- `CASE_CREATED`
- `CASE_STATUS_CHANGED`
- `CASE_RESOLVED`
- `FOLLOW_UP_CREATED`
- `FOLLOW_UP_SENT`
- `FOLLOW_UP_ANSWERED`
- `FOLLOW_UP_CONFLICTED`
- `ORGANIZATION_NOTICE_DECIDED`
- `ORGANIZATION_NOTICE_SENT`
- `ORGANIZATION_NOTICE_DELIVERY_FAILED`

Audit event mesaj içeriğini ikinci kez kopyalamaz; message/revision ID’ye referans verir.

## 9. Hata ve çakışma davranışları

- Yetkisiz conversation/message erişimi: `forbidden` veya kaynak varlığını gizlemek gerekiyorsa `not found`.
- Stale message revision: `conflict`.
- Geçersiz follow-up cevabı: validation error.
- Kapalı case üzerinde izin verilmeyen geçiş: conflict/unprocessable.
- `sendNotice = YES` fakat organization yok veya yetkisiz: validation/forbidden.
- Aynı idempotency key ile farklı payload: conflict.
- Kural motoru hatası mesaj kaydını kaybettirmez; tarama işi tekrar denenebilir ve operasyonel hata üretir.

## 10. Kabul kriterleri

1. Yetkili katılımcı mesaj gönderdiğinde tekil mesaj ve ilk revision kaydı oluşur.
2. Aynı client request ID tekrarlandığında ikinci mesaj oluşmaz.
3. Mesaj sahibi güncel revision üzerinden düzenleme yaptığında eski/yeni içerik kalıcı revision olarak saklanır.
4. Stale revision ile düzenleme mesajı değiştirmez ve conflict sonucu verir.
5. Hasta ve klinik temsilcisi yalnız güncel içeriği ve düzenlendi bilgisini görür; eski içerik hiçbir katılımcı response/event’inde görünmez.
6. Süper admin herhangi bir conversation’daki güncel mesajları ve bütün revision’ları görebilir.
7. Süper admin conversation veya revision açtığında audit event oluşur.
8. Mesaj silme işlemi/API’si yoktur.
9. Düz yazılmış telefon benzeri sayı dizisi ilgili rule ile flag üretir.
10. Boşluk, tire, nokta veya parantezlerle bölünmüş telefon dizisi normalize edilip flag üretir.
11. Unicode decimal rakamlarıyla yazılmış telefon dizisi ortak forma dönüştürülüp flag üretir.
12. Yapılandırılmış sayı sözlüğü kapsamındaki yazıyla/hecelenmiş sayı dizisi flag üretir.
13. Düzenlenen yeni revision yeniden taranır; eski revision ve eski flag izi kaybolmaz.
14. Aynı revision ve rule retry ile duplicate açık flag üretmez.
15. Denetim AI/model/embedding veya harici moderation servisi çağırmaz.
16. Flag mesajı silmez veya otomatik yaptırım uygulamaz.
17. Yetkili konuşma katılımcısı complaint/support kaydı açabilir; süper admin durum ve çözümü güncelleyebilir.
18. Hareketsiz lead için follow-up üretilebilir; YES/NO cevap ve çelişkili cevap admin incelemesine taşınır.
19. Süper admin `sendNotice = NO` seçtiğinde dış bildirim oluşmaz, karar audit edilir.
20. Süper admin `sendNotice = YES` ve yetkili organization seçtiğinde tekil denetim bildirimi oluşur; teslim sonucu audit edilir.
21. Kuruluş bildirimi eski revision içeriklerini otomatik açığa çıkarmaz.
22. Teknik loglarda mesaj/revision içeriği, sağlık verisi, belge, OTP veya token bulunmaz.

## 11. Kapsam dışı

- AI/LLM/embedding tabanlı moderation.
- Concierge dizini, sağlayıcı hesabı veya rezervasyon.
- Otomatik mesaj silme, otomatik hesap engelleme veya otomatik yaptırım.
- WhatsApp entegrasyonu.
- Dosya upload implementasyonu.
- Quote, payment, appointment ve treatment state machine.
- Admin/klinik/hasta arayüz tasarımı.
- Fiziksel DB schema, migration, endpoint path ve framework kodu.

## 12. Bağımlılıklar

Implementation öncesi gerekli diğer sözleşmeler:

- Kimlik, session ve rol modeli.
- Organization membership ve lead assignment.
- Conversation katılımcı modeli.
- Audit retention ve yetkili audit okuyucuları.
- Notification/outbox/job altyapısı.
- İlk dil/alfabe ve screening rule set’i.

## 13. Açık sorular

1. Mesaj kaç dakika/saat boyunca ve en fazla kaç kez düzenlenebilir?
2. Message, revision ve audit kayıtlarının retention süresi nedir?
3. İlk denetim dili/sayı sözlüğü yalnız Türkçe mi, Türkçe + İngilizce + Arapça mı?
4. Hareketsizlik eşiği kaç gün; follow-up hasta, klinik veya iki tarafa mı gider?
5. Kuruluş denetim bildirimi hangi kanaldan gönderilir?
6. Flag severity seviyeleri ve insan inceleme hedef süresi nedir?
7. Admin conversation/revision audit’ini yalnız süper admin mi, ayrı auditor rolü de okuyacak mı?

## 14. Doğrulama planı

Kod yazıldığında bu spec şu gerçek senaryolarla doğrulanmalıdır:

1. Mesaj gönder → düzenle → katılımcı eski içeriği göremez → süper admin iki sürümü görür.
2. Düz, ayırıcılarla bölünmüş, Unicode rakamlı ve yazıyla/hecelenmiş telefon örnekleri ilgili rule ile flag üretir.
3. False-positive mesaj admin tarafından kapatılır; mesaj konuşmada kalır.
4. Complaint/support kaydı açılır, çözülür ve audit zinciri izlenir.
5. Follow-up YES/NO cevapları ve çelişkili taraf cevapları admin kuyruğuna yansır.
6. Süper admin seçilen kuruluşa bildirimi YES/NO ile kontrol eder; retry duplicate teslim üretmez.
7. Teknik log çıktısında raw mesaj veya revision içeriği bulunmaz.
