# Backend Project Overview

> **Proje adı henüz belirlenmedi.** “Veyora” kaynak konuşmada çalışma adı olarak kullanıldı; kullanıcı daha sonra bu adın kesin olmadığını açıkça belirtti.

## Durum sözlüğü

- **Accepted:** Kullanıcının açıkça istediği veya bu görevde kesinleştirdiği gereksinim/karar.
- **Proposed:** Kaynak konuşmadaki assistant tarafından önerilmiş, kullanıcı tarafından kesin kabul edilmemiş seçenek.
- **Unknown:** Karar vermek için yeterli bilgi yok.
- **Rejected:** Kullanıcı tarafından açıkça reddedilmiş seçenek.
- **Deprecated:** Sonraki bir kararla geçersiz kalmış eski karar.

## Ürün özeti

Ürün; uluslararası hastaları doğrulanmış hastane/klinik, doktor ve tedavi seçenekleriyle buluşturan, talep–teklif–mesajlaşma–randevu–tedavi takibini merkezileştiren bir sağlık turizmi platformudur. Platformun kendisi tıbbi hizmet sağlayıcı değil; hasta ile sağlık kuruluşunu bir araya getiren ve süreci izleyen aracıdır.

- **Accepted — mesajlaşma ve sonuç takibi:** Kullanıcı uygulama içi mesajlaşmayı, lead follow-up’ı ve sonuçsuz kalan görüşmeler için uyarı verilmesini istedi.
- **Accepted — deterministik mesaj denetimi:** MVP’de AI kullanılmayacak; anahtar kelime, gizlenmiş telefon numarası, rakamların yazıyla/hecelenerek verilmesi ve benzeri kaçınma biçimleri normalize edilip kurallarla taranacak.
- **Deprecated — concierge MVP belirsizliği:** Concierge daha önce ürün kapsamına eklenmişti; güncel kullanıcı kararıyla mevcut MVP’den çıkarıldı.
- **Deprecated — AI mesaj analizi amacı:** AI analizi daha önce istenmişti; güncel kullanıcı kararıyla mevcut MVP’den çıkarıldı.
- **Proposed — marketplace/referral/CRM ve komisyon modeli:** Bağlantılı konuşmadaki assistant’ın ilk ürün özeti. Komisyon oranı veya muhasebe davranışı kullanıcı tarafından kesinleştirilmedi.
- **Proposed — platform tıbbi öneri vermez, yalnızca eşleştirir:** Kaynak assistant özeti; kullanıcı tarafından ayrıca onaylanmadı, fakat güvenlik açısından korunması gereken ürün sınırı adayıdır.

## Hedefler

Aşağıdaki hedefler mevcut MVP kararlarını yansıtır.

1. **Accepted:** Hasta veya anonymous ziyaretçi, published/verified/active/public-safe organization, doctor ve treatment kayıtlarını PostgreSQL-first search, allowlisted filtreler ve cursor pagination ile bulabilsin.
2. **Proposed:** Hasta bir tedavi talebi oluşturup izin verdiği bilgi ve dosyaları seçili kliniğe iletebilsin.
3. **Proposed:** Klinik temsilcisi talebi görebilsin, hasta ile mesajlaşabilsin, ek bilgi isteyebilsin ve teklif oluşturabilsin.
4. **Proposed:** Hasta teklifi görüntüleyip kabul veya reddedebilsin; kabul edilen teklif randevu ve süreç takibine bağlanabilsin.
5. **Accepted:** Mesajlar silinerek iz bırakmadan kaybolmasın; düzenlemeler kalıcı revision olarak saklansın.
6. **Accepted:** Konuşma katılımcıları yalnız güncel mesajı ve düzenlendi göstergesini görsün; eski içerikleri yalnız süper admin görebilsin.
7. **Accepted:** Süper admin bütün konuşmaların güncel ve eski sürümlerini her zaman okuyabilsin; erişim ve admin işlemleri audit log’da görünsün.
8. **Accepted:** Deterministik kurallar açık veya gizlenmiş iletişim bilgisi paylaşımını işaretlesin; AI kullanılmasın.
9. **Accepted:** Lead follow-up, şikâyet ve destek kayıtları ile seçilen kuruluşa denetim bildirimi gönderme davranışı bulunsun.
10. **Accepted:** Teknik loglama için lisans/abonelik maliyeti yaratmayan veya ücretsiz/self-hosted seçenekler önceliklendirilsin.

## Aktörler ve roller

| Aktör / rol | Durum | Temel sorumluluk | Bilinen erişim sınırı |
| --- | --- | --- | --- |
| Hasta / kullanıcı | **Accepted** | Seçenekleri araştırmak, talep oluşturmak, izinli bilgi/dosya paylaşmak, mesajlaşmak, teklif ve süreci takip etmek | Google/Apple/email-password Firebase identity; kendi profile, talepleri, konuşmaları, dosyaları ve kendisine iletilen teklifler |
| Organization member/admin | **Accepted** | Davet ile kuruluş üyeliği, kuruluşuna gelen leadleri yönetmek, mesajlaşmak, belge istemek, teklif/randevu/süreç bilgisi üretmek | Yalnızca `active` membership + assignment/share policy’nin açtığı kuruluş kaynakları |
| Süper admin | **Accepted** | Bütün konuşmaları ve message revision’larını her zaman okumak; kuruluşları, denetim flag’lerini, şikâyet/destek kayıtlarını ve audit geçmişini yönetmek | Mesajların eski/yeni bütün sürümlerine erişebilir; hassas erişim ve işlemler audit log’a yazılır |
| Concierge hizmet sağlayıcı | **Deprecated (mevcut MVP)** | Önceki kapsamda yardımcı hizmet sunmak | Güncel kullanıcı kararıyla mevcut MVP’de rol ve API yüzeyi oluşturulmayacak |
| Doktor profili | **Accepted** | Kuruluş altında doğrulanabilir profil ve tedavi bilgisiyle listelenmek | Organization-managed profile; bağımsız login/session yok |
| Operasyon/admin alt rolleri | **Proposed sonraki ayrıntı** | Destek, doğrulama, risk inceleme veya içerik yönetimi | Super admin dışı capability matrisi implementation/operasyon kaydında |

## Temel kullanıcı akışları

### 1. Keşif ve tedavi talebi

1. **Hasta → işlem:** Tedavi, klinik, doktor veya yardımcı hizmetleri arar; filtreler ve profilleri inceler.
2. **Backend → kontrol:** Yalnızca published + verified + active + public-safe kayıtları ve kullanıcının görebileceği alanları döndürür (**Accepted; SPEC-005**).
3. **Hasta → işlem:** Structured intake, explicit share grant ve en fazla üç eligible organization seçimiyle Inquiry submit eder (**Accepted; SPEC-007**).
4. **Backend → kontrol:** Authentication, güncel general consent, organization eligibility, grant, 1–3 organization sınırı, idempotency ve field validation uygular (**Accepted; SPEC-007**).
5. **Veri değişikliği:** Inquiry, organization başına izole Lead/Assignment, explicit grant ve append-only ilk timeline event’i all-or-nothing kaydedilir.
6. **Sonuç:** Yetkili klinik temsilcisi talebi görür; hasta talep kimliği ve başlangıç durumunu alır.

**Karar:** Public discovery anonymous çalışır; inquiry/lead oluşturma authenticated Patient’a aittir. Tek Inquiry en fazla üç selected organization Lead’ine yönlenir; recipient-specific consent snapshot yoktur.

### 2. Klinik değerlendirmesi, mesajlaşma ve teklif

1. **Klinik temsilcisi → işlem:** Yetkili lead’i açar; hastanın paylaştığı alanları inceler.
2. **Backend → kontrol:** Temsilcinin kuruluş üyeliğini, lead atamasını ve dosya erişimini doğrular.
3. **Taraflar → işlem:** Hasta ve temsilci mesajlaşır; izin verilen ekleri paylaşır.
4. **Backend → veri değişikliği:** Mesajı değişmez kimlikle kaydeder; düzenleme yeni revision üretir. Konuşan taraflara yalnız güncel içerik ve “düzenlendi” bilgisi döner; eski/yeni revision içeriğini yalnız süper admin görebilir (**Accepted**).
5. **Klinik → işlem:** Teklif oluşturur ve gönderir (**Proposed**).
6. **Backend → kontrol:** Para birimi, geçerlilik tarihi, dahil/hariç kalemler ve durum geçişini doğrular (**Proposed**).
7. **Sonuç:** Hasta yeni mesaj/teklif bildirimi alır; talep zaman çizelgesi güncellenir.

**Açık soru:** Mesaj düzenleme zaman penceresi, düzenleme sayısı limiti ve revision/audit retention süresi.

### 3. Teklif, randevu ve süreç takibi

1. **Hasta → işlem:** Teklifi kabul veya reddeder; gerekirse soru sorar.
2. **Backend → kontrol:** Teklifin hastaya ait talebe bağlı, aktif ve süresi dolmamış olduğunu doğrular.
3. **Veri değişikliği:** Teklif ve lead durumu atomik olarak değiştirilir; çakışan kabul denemeleri reddedilir.
4. **Klinik/hasta → işlem:** Randevu zamanı üzerinde anlaşır veya randevu talebi oluşturur (**Proposed**).
5. **Veri değişikliği:** Randevu ve durum olayları kaydedilir; tamamlanma/iptal gibi her geçişin aktörü ve zamanı tutulur.
6. **Sonuç:** İki taraf da güncel durum ve zaman çizelgesini görür.

**Açık soru:** Kesin durum makinesi, geçiş yetkileri, randevu saat dilimi kaynağı ve klinik tekliflerinin bağlayıcılığı.

### 4. Lead sonucu ve platform dışı görüşme takibi

1. **Backend → kontrol:** Accepted/in-discussion/awaiting-patient Lead’de 7 gün meaningful activity yoksa follow-up başlatır (**Accepted; SPEC-007**).
2. **Sistem → işlem:** Klinik ve/veya hastaya sonuç sorusu gönderir; cevap biçimi en az “Evet/Hayır” sonucunu destekler (**Accepted davranış; kanal/zamanlama Proposed**).
3. **Veri değişikliği:** Tarafların sonuç beyanları, hatırlatmalar ve zaman damgaları kaydedilir.
4. **Backend → kontrol:** Çelişkili cevapları veya cevapsız kalan follow-up’ları süper admin incelemesine düşürür.
5. **Sonuç:** Follow-up geçmişi lead ve audit bağlamında görüntülenebilir.

### 5. Deterministik mesaj denetimi ve admin incelemesi

1. **Mesaj → işlem:** Mesaj kalıcı olarak kaydedilir.
2. **Backend → kontrol:** Normalize edilmiş denetim görünümü üzerinde anahtar kelime, telefon/iletişim bilgisi, boşluk/noktalama ile bölme, Unicode rakamları, rakamları yazıyla veya heceleyerek verme ve benzeri kaçınma biçimlerini deterministik kurallarla tarar (**Accepted**).
3. **Veri değişikliği:** Eşleşen kural kimliği, maskelenmiş kanıt, ilgili mesaj ve kural sürümüyle denetim flag’i oluşturulur. AI/model çağrısı yapılmaz.
4. **Süper admin → işlem:** Flag ile ilişkili konuşmanın güncel mesajlarını ve tüm revision geçmişini açabilir; şikâyet veya destek kaydı oluşturabilir.
5. **Backend → kontrol:** İnceleme, erişim, karar ve bildirim işlemleri audit log’a yazılır.
6. **Süper admin → sonuç:** Seçtiği kuruluşa — örneğin ilgili hastane/kliniğe — denetim kaydı bildirimi göndermeyi “Evet/Hayır” seçimiyle belirler. Gönderim kararı ve teslim sonucu audit edilir.

### 6. Şikâyet ve destek

1. Hasta veya klinik temsilcisi konuşma/mesaj bağlamında şikâyet ya da destek kaydı açar.
2. Backend aktörün ilgili konuşmaya erişimini doğrular ve kaydı mesaj/conversation/lead ile ilişkilendirir.
3. Süper admin kaydı, konuşmayı ve revision geçmişini inceler; durum ve çözüm notunu günceller.
4. Oluşturma, atama, durum değişikliği, admin erişimi ve kuruluş bildirimi audit log’da görünür.

### 7. Concierge hizmetleri

Concierge dizini, sağlayıcı hesabı, teklif veya rezervasyon akışı **mevcut MVP kapsamı dışındadır**. Önceki kabul **Deprecated** durumundadır; ileride ayrıca spec hazırlanmadıkça backend modülü/API’si oluşturulmaz.

## Özellikler ve MVP sınırı

### MVP

| Özellik | Durum | Dayanak / not |
| --- | --- | --- |
| Hasta hesabı ve profil | **Accepted boundary / SPEC-004 ayrıntı** | Google/Apple/email-password Firebase auth; public discovery, inquiry’de auth gate, device session ve genel rıza SPEC-003 |
| Klinik/doktor/tedavi keşfi | **Accepted** | PostgreSQL-first normalized search; allowlisted filters; cursor 20/50; private patient favorites; SPEC-006 |
| Klinik temsilci panelini besleyen backend | **Accepted ihtiyaç / Proposed ayrıntı** | Plan hasta–klinik–admin tarafları üzerinden sürüyor |
| Tedavi talebi/lead | **Proposed** | Assistant MVP’sinde merkezî akış |
| Dosya/belge paylaşımı | **Proposed** | Saklama/erişim politikası kesinleşmedi |
| Mesajlaşma | **Accepted** | Kullanıcı açıkça mesajlaşmanın bulunmasını istedi |
| Kalıcı message revision; katılımcılara yalnız güncel içerik | **Accepted** | Güncel kullanıcı kararı |
| Süper adminin bütün mesaj ve revision’lara sürekli erişimi | **Accepted** | Güncel kullanıcı kararı; erişim/işlemler audit edilir |
| Deterministik keyword ve gizlenmiş iletişim bilgisi denetimi | **Accepted** | AI yerine kural/normalizasyon tabanlı sistem istendi |
| Lead follow-up ve Evet/Hayır sonucu | **Accepted** | Güncel kullanıcı kararı |
| Şikâyet ve destek kayıtları | **Accepted** | Güncel kullanıcı kararı |
| Seçilen kuruluşa opsiyonel denetim bildirimi | **Accepted** | Süper admin “Evet/Hayır” ile gönderimi seçer; audit edilir |
| Teklif, kabul/red ve soru sorma | **Proposed** | Assistant MVP tanımı |
| Randevu ve süreç zaman çizelgesi | **Proposed** | Assistant MVP tanımı |
| Ücretsiz/self-hosted teknik loglama | **Accepted operasyon hedefi** | Kullanıcı ücretli loglama istemediğini belirtti |

### Mevcut MVP kapsamı dışında

| Özellik | Durum | Dayanak / not |
| --- | --- | --- |
| Concierge dizini, sağlayıcı hesabı ve rezervasyonu | **Deprecated / kapsam dışı** | Güncel kullanıcı “concierge kısımları şu an olmayacak” dedi |
| AI destekli mesaj analizi | **Deprecated / kapsam dışı** | Güncel kullanıcı “AI analizi de şu an değil” dedi |
| Ödeme alma | **Proposed sonraya bırakma** | Assistant MVP önerisinde yok; kullanıcı tarafından açıkça reddedilmedi |
| Otel/uçak için tam rezervasyon motoru | **Proposed sonraya bırakma** | Kaynak assistant özeti otel rezervasyonunu geleceğe bıraktı |
| Referral/puan sistemi | **Proposed sonraya bırakma** | Assistant MVP önerisinde dışarıda |
| Sponsorlu reklamlar/kampanyalar | **Proposed sonraya bırakma** | Assistant MVP önerisinde dışarıda |
| Uygulama içi görüntülü görüşme | **Proposed sonraya bırakma** | Assistant MVP önerisinde dışarıda |
| Harita görünümü | **Proposed sonraya bırakma** | Assistant MVP önerisinde dışarıda |
| Çok ülke/dil genişlemesi | **Proposed sonraya bırakma** | Kesin pazar/diller Unknown |
| Komisyon/referral muhasebesi | **Proposed / Unknown MVP** | Kullanıcı kabulü ve muhasebe kapsamı net değil |

## Kapsam dışı işler

### Bu hazırlık görevi için

- **Deprecated:** Önceki hazırlık görevinde ilk feature spec’in kullanıcı tarafından daha sonra oluşturulacağı kararı vardı.
- **Accepted:** Güncel kullanıcı talimatı ilk feature spec’in bu görevde oluşturulmasını istedi.
- **Accepted:** Backend veya frontend uygulama kodu, schema, migration, endpoint, deployment ve test hâlâ bu görevin dışındadır.
- **Accepted:** UI tasarım sistemi, ekran tasarımı, renk, typography ve component kuralları hazırlanmayacak.
- **Accepted:** Kaynakta geçici kullanılan “Veyora” veya “Medical Tourism” ifadeleri kesin proje adı olarak kullanılmayacak.

### Ürün için

- **Rejected (mevcut MVP):** Concierge backend’i ve AI mesaj analizi.
- **Rejected (şimdilik):** WhatsApp izin/entegrasyon akışını bu planlama aşamasında ele almak.
- Diğer kapsam dışı adaylar “Mevcut MVP kapsamı dışında” tablosunda tutulur.

## Başarı kriterleri

Aşağıdakiler mevcut MVP için gelecekte doğrulanması gereken davranışlardır:

1. Yetkili bir hasta hesabı, doğrulanmış klinik/tedavi kayıtlarını listeleyebilir ve en az bir klinik için talep oluşturabilir.
2. Yalnızca ilgili kuruluşun yetkili temsilcisi bu talebi ve hastanın açıkça paylaştığı verileri görebilir.
3. Hasta ve temsilci mesajlaşabilir; mesaj düzenlenince katılımcılar yalnız güncel içeriği ve “düzenlendi” göstergesini görür.
4. Her mesaj düzenlemesi eski/yeni içerik, aktör ve zaman bilgisiyle kalıcı revision üretir; yalnız süper admin revision geçmişini görebilir.
5. Süper admin bütün konuşmaları ve revision’ları her zaman açabilir; erişim ve admin işlemleri audit log’a yazılır.
6. Deterministik denetim; düz/boşluklu/noktalama ile ayrılmış telefonları, Unicode rakamlarını, yazıyla/hecelenerek verilen sayıları ve yapılandırılmış risk ifadelerini kural sürümüyle işaretleyebilir.
7. Hareketsiz lead için follow-up oluşturulabilir; Evet/Hayır sonucu ve çelişkili/cevapsız durum admin incelemesine taşınabilir.
8. Konuşma bağlamında şikâyet veya destek kaydı açılabilir ve bütün durum değişiklikleri audit edilir.
9. Süper admin bir denetim kaydını seçilen kuruluşa göndermeyi Evet/Hayır olarak belirleyebilir; gönderim ve teslim sonucu audit edilir.
10. AI analizi veya concierge API/modülü bu MVP spec’ine sızmaz.
11. Sağlık verisi, mesaj içeriği, belge içeriği, parola/OTP/token gibi sırlar teknik loglara yazılmaz.
12. Uygulama davranışı ilgili feature spec’teki kabul kriterleri doğrulanmadan “tamamlandı” sayılmaz.
