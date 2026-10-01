# AI Workflow Rules — Backend

Bu proje spec-driven ilerler. Altı context belgesi ürün sınırını, karar durumlarını ve çalışma kurallarını taşır; uygulanacak ayrıntıyı kullanıcı tarafından sağlanan veya açıkça oluşturulması istenen, ardından kabul edilen feature spec belirler.

> **Deprecated:** İlk backend feature spec’ini yalnız kullanıcının oluşturacağı önceki kural, kullanıcının güncel “ilk spec oluştur” talimatıyla geçersizdir. İlk oluşturulan spec `docs/specs/001-message-governance-and-lead-follow-up.md` dosyasıdır; uygulamaya başlamak yine ayrı kullanıcı talimatı gerektirir.

## Zorunlu okuma sırası

Her backend görevinden önce:

1. `docs/project-overview.md`
2. `docs/architecture.md`
3. `docs/api-context.md`
4. `docs/code-standards.md`
5. `docs/ai-workflow-rules.md`
6. `docs/progress-tracker.md`
7. Kullanıcının işaret ettiği ilgili feature spec

Çelişkide sıralama: güncel kullanıcı talimatı → kabul edilmiş feature spec → **Accepted** context kararı → **Proposed/Unknown** context notu. Çelişkiyi sessizce gizleme; belgeye kaydet.

## Zorunlu çalışma akışı

### 1. Bağlamı oku

- Altı context belgesini yukarıdaki sırayla oku.
- Aktif kararın **Accepted**, **Proposed**, **Unknown**, **Rejected** veya **Deprecated** durumunu doğrula.
- Proje adını veya framework’ü tahmin etme.

### 2. İlgili spec’i oku

- Yalnız kullanıcı tarafından sağlanan, açıkça oluşturulması istenen veya onaylanan spec üzerinde çalış.
- Kabul kriterlerini, kapsam dışını, veri erişimini, durum geçişlerini ve hata davranışını çıkar.
- Spec yoksa ve kullanıcı spec oluşturmayı istemediyse feature implementation’a başlama; açık soruyu `progress-tracker.md` içine kaydet.

### 3. Mevcut durumu incele

- Kod oluştuğunda mevcut modül, pattern, migration, test ve callsite’ları incele.
- İkinci bir mimari/pattern oluşturma; mevcut kabul edilmiş yaklaşımı kullan.
- Bir exported symbol değiştirilecekse mevcut referansları symbol-aware araçla incele.
- Kullanıcının bildirdiği hata/sonuç gerçektir; yalnız tekrar doğrulamak için gereksiz kontrol yapma.

### 4. Kapsamı belirle

- Tek bir anlamlı backend birimi seç.
- Girdi/çıktı, auth, ownership, transaction, audit, hata ve doğrulama sınırını yazılı olarak netleştir.
- Spec’in dışındaki “iyi olur” özellikleri, refactor’ları veya altyapıyı ekleme.
- Önemli belirsizlik implementasyonu farklılaştırıyorsa açık soru olarak kaydet; küçük, geri döndürülebilir uygulama tercihlerinde gereksiz onay döngüsü oluşturma.

### 5. Uygula

- Kök nedeni ve tam kabul kriterini uygula.
- Route/controller’ı ince tut; iş kuralını application/domain sınırında tut.
- Auth ile kaynak yetkisini ayrı uygula.
- Kritik yazımlarda transaction, idempotency ve concurrency gereksinimini değerlendir.
- Secret, sağlık verisi, mesaj/belge içeriği veya token loglama.
- Kabul edilmemiş provider, ücretli servis, dependency veya veri paylaşımı ekleme.

### 6. Doğrula

- Değişen davranışı gerçek çalıştırma/smoke scenario ile göster.
- Bug fix ise önce reproduksiyon, sonra aynı senaryonun düzelmiş sonucu.
- İlgili mevcut testleri çalıştır; bütün proje suite’ini gereksiz yere çalıştırma.
- Test edilmemiş davranışı “çalışıyor”, “tamamlandı” veya “production hazır” diye raporlama.
- Test komutu/script’i repository’de yoksa varmış gibi yazma; uygun smoke yöntemi kullan ve sınırlamayı belirt.

### 7. Belgeleri güncelle

Her görev sonunda:

- `docs/progress-tracker.md`: tamamlanan birim, doğrulama kanıtı, açık sorular, sonraki adım.
- Karar değiştiyse ilgili context belgesi: eski kararı **Deprecated**, yenisini dayanağıyla **Accepted** yap.
- API/architecture/code standardı gerçekten değiştiyse ilgili canonical belge.
- Laya kullanıldıysa araç adı, kısa sonuç ve çalışmaya etkisi.
- Obsidian erişimi/senkronizasyonu yapıldıysa doğrulanmış yerel/uzak sonuç.

## Scoping kuralları

- Aynı görevde ilgisiz API gruplarını birleştirme.
- Feature spec’in kapsamını kendiliğinden büyütme.
- **Proposed** davranışı kullanıcı kabulü olmadan **Accepted** yapma veya uygulama.
- **Unknown** erişim/veri modelini “mantıklısı bu” diyerek sessizce seçme.
- **Rejected** veya **Deprecated** yolu geri getirme.
- Gereksiz dependency, abstraction, mikroservis, queue, cache, telemetry veya refactor ekleme.
- Clean cutover gerekiyorsa tüm caller/test/doc’u güncelle; yarı eski yarı yeni contract bırakma.
- Yeni branch, worktree veya clone oluşturma talimatı verme; kullanıcı ayrıca istemedikçe mevcut çalışma alanında kal.
- Başka bir context/brain sistemi oluşturma; canonical teknik bağlam `docs/` altındaki bu altı dosyadır.

## Belirsizlikleri yönetme

Agent şu ayrımı yapmalıdır:

- **Ürün davranışını, MVP kapsamını, teknoloji omurgasını veya hassas veri erişimini değiştiriyorsa:** soru sor veya spec’te açık karar iste.
- **Küçük, yerel, geri döndürülebilir implementation ayrıntısıysa:** mevcut standart/pattern’e göre güvenli tercihi yap ve raporla.
- Ulaşılamayan bilgi için yapılan denemeyi ve eksik önkoşulu yaz; ulaşılabilir bilgiyi kullanıcıdan isteme.
- Bir karar değiştiğinde eski kararı silip tarihçeyi yok etme; **Deprecated** olarak kısa dayanakla koru.

### Spec başlangıç karar kapısı

- Kullanıcı yeni bir spec’in yazılmasını istediğinde, önce o spec’in bütün `Unknown` ve `Proposed` kararlarını mevcut context/spec/roadmap üzerinden çıkar.
- Kararları tek tek dağınık istemek yerine, bağımsız kararları **toplu ve anlamlı soru grupları** halinde kullanıcıya sor.
- Kullanıcı cevaplarını ilgili spec, canonical context, `docs/progress-tracker.md` ve `Proje Özeti.md` içine karar durumu ve dayanakla işle.
- Cevaplanmamış kritik kararları sessizce seçme; spec’i “hazır/incelenebilir” olarak tut ve implementation-ready ilan etme.
- Kullanıcı “SPEC-NNN’e başla” dediğinde bu kapı yeniden uygulanır; önceki spec’lerin açık kararları otomatik olarak kapanmış sayılmaz.

## Güvenlik ve veri

- Secret değerleri context, spec, progress tracker, Obsidian notu, log veya örnek payload’a yazılmaz.
- Hasta sağlık verisi, mesaj ve belge içeriği yalnız feature spec’te tanımlı amaç ve aktöre açılır.
- Süper adminin bütün mesaj ve revision’lara erişimi **Accepted**’dır; uygulamada doğrulanmış rol kontrolü ve audit olmadan bypass eklenmez.
- Teknik log ile audit log ayrılır; hassas içerik her ikisine de körlemesine kopyalanmaz.
- Harici AI/SaaS’a veri gönderimi provider, amaç, minimizasyon, retention ve maliyet kararı **Accepted** olmadan eklenmez.

## Dependency ve refactor disiplini

- Dependency yalnız gerçek ihtiyaç, lisans/bakım/güvenlik incelemesi ve mevcut stack ile çözülememe gerekçesiyle eklenir.
- “İleride lazım olur” diye dependency veya altyapı eklenmez.
- Feature implementasyonu sırasında ilgisiz dosyaları formatlama, isim değiştirme veya klasörleme.
- Var olan kötü pattern kapsamı bloke etmiyorsa ayrı iş olarak kaydet; feature’a gizlice katma.

## Laya

### Kullanım kuralı

Her görevde erişilebilir Laya araçları doğrudan görev sınıflandırma/routing için kullanılmalıdır. Laya açık uçlu tasarım üretmez; yapılandırılmış karar desteğidir.

1. Görev başında `laya_route` ile uygun checkpoint’i belirle; sınıflandırma yararlıysa `laya_predict` ile finite `choice`, ordinal `score` veya calibrated `noul` sorusu çalıştır.
2. Laya sonucunu kullanıcı kapsamını genişletmek, ürün kararı icat etmek veya düşük güvenli tahmini gerçek saymak için kullanma.
3. Her görev sonunda kullanılan Laya aracı, route/model, kısa karar, confidence ve çalışmaya etkisini `progress-tracker.md` ile Obsidian proje özetine yaz.
4. Laya erişilemiyorsa nedeni kaydet ve bağımsız çalışmaya devam et.
5. Ölçülmemiş token veya maliyet tasarrufunu sayısal başarı olarak raporlama.

### Doğrulanmış araç durumu ve son kullanım

- `laya_status`: `english` ve `multilingual` checkpoint’leri CPU’da yüklü; router hazır.
- Son `laya_route`: SPEC-007 inquiry/routing/grant/state/follow-up karar kapısı için `english` checkpoint’i.
- Bu görevde Laya, SPEC-007 Unknown/Proposed kararlarının tek grouped decision gate ile sorulmasını doğruladı; kullanıcı yanıtları ürün/teknoloji kararının kaynağıdır.
- Kullanıcı yanıtları SPEC-007 ve ilgili canonical context belgelerine işlendi.
- Etki: SPEC-007 hazırlandı; implementation başlamadı.

## Obsidian ve shared memory

### Zorunlu görev sonu kuralı

Her görev sonunda:

1. Yapılan işleri, kabul edilen/değişen kararları, değişen dosyaları, açık soruları ve sonraki adımı Obsidian proje özetine yaz.
2. Medical Tourism brain vault erişilebiliyorsa aynı özeti mevcut ilgili nota
   ekle; önce mevcut bağlamı ara, sonra duplicate üretmeden güncelle.
3. Secret veya ham sağlık/mesaj/belge içeriği hiçbir hafıza kaydına yazma.
4. Yerel Obsidian yazımını ve varsa uzak sync sonucunu ayrı doğrula.
5. Medical Tourism brain vault yazılamazsa nedeni açıkça raporla ve yazılması gereken özeti görev çıktısında ver.

### Doğrulanmış durum

- Kod kökü: `/Users/berat/medical-tourism/medical-tourism`.
- Yerel Medical Tourism Obsidian brain vault: `/Users/berat/medical-tourism/medical-tourism-brain`.
- İnsan tarafından okunabilir proje hafızası: `Proje Özeti.md`.
- Canonical teknik bağlam: `docs/` altındaki altı context belgesi; Obsidian özeti ikinci karar kaynağı değildir.
- Obsidian Sync core plugin etkin görünür; uzak teslim sonucu bu çalışma ortamında doğrulanamaz.
- Ventura Brain kullanılmaz. Kalıcı hafıza yalnız Medical Tourism brain vault’una yazılır.

## Görev sonu kontrolü

Bir backend görevi “tamamlandı” denmeden önce:

1. İlgili spec’in bütün acceptance criterion’ları karşılandı.
2. Tüm callsite, test ve dokümanlar yeni contract’a geçti.
3. Auth, ownership/organization, validation, transaction, audit ve secret redaction değerlendirildi.
4. Değişen davranış gerçek senaryo ile doğrulandı ve exact komut/sonuç raporlandı.
5. `progress-tracker.md` güncellendi.
6. Yeni kararlar durum/dayanak ile canonical belgeye işlendi.
7. Geçici script/artifact temizlendi; kullanıcı işi korunarak bırakıldı.
