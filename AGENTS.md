# Medical Tourism — ortak agent çalışma kuralları

Bu dosya, proje araçları arasında ortak çalışma sözleşmesidir. Proje ürün ve
teknik spec’lerin yanında SPEC-001–012 için ilk executable backend slice’larını
da içerir. Kurallar sonraki uygulama görevlerinde de geçerlidir.

## Göreve giriş

Her görevde şu sırayı izle:

1. `AGENTS.md` ve `CONTEXT.md` dosyalarını oku.
2. Görev trivial değilse Medical Tourism brain vault’undaki ilgili Obsidian
   handoff notunu oku: `/Users/berat/medical-tourism/medical-tourism-brain/50-Journal/Current State.md`;
   karar veya agent bağlamı gerekiyorsa aynı vault’taki `90-Agent Context/`
   notlarını oku.
   Vault’un tamamını okumak gerekmez.
3. İlgili canonical context belgelerini ve approved spec’i incele.
4. Birden fazla adım veya karar varsa Laya ile route/structured decision al.
5. İlgili dosya ve sembolleri Serena ile keşfet.
6. Yazma gerekiyorsa mevcut proje klasöründe, tek yazan ajanla ilerle.

## Proje sınırı

- Spec’ler gereksinim kaynağıdır: `docs/specs/001-*.md`–`012-*.md` mevcut
  kapsamın temelidir. Spec’lerdeki `Accepted`, `Proposed`, `Unknown`,
  `Rejected`, `Deprecated` durumlarını koru.
- Kullanıcı açıkça istemedikçe spec dosyalarını silme, taşıma, yeniden
  adlandırma veya içeriklerini değiştirme.
- Ortak-agent kurulum görevinde uygulama kodu üretme; açık uygulama görevinde
  ilgili spec ve bağımlılıklarını uygulamak bu kuralın dışındadır.
- Uygulama görevi geldiğinde yalnız ilgili spec’i ve bağımlılıklarını
  inceleyip uygula; spec’teki açık kararı sessizce `Accepted` yapma.
- Kaynak projeye ait alan adları, iş kuralları, roller, kod listeleri veya
  kararlar bu projeye taşınamaz. Yalnız ortak çalışma düzeni uyarlanır.

## Agent rolleri ve yazma düzeni

- `explorer`: salt okunur dosya/spec/pattern keşfi.
- `implementer`: kullanıcı tarafından istenen uygulama değişikliğini yapar.
- `tester`: değişen pakette hedefli test ve doğrulama çalıştırır; test geçsin
  diye kaynak kodu değiştirmez.
- `reviewer`: yalnız auth, authorization, privacy, veri modeli, migration,
  belge güvenliği veya büyük/çok paketli risklerde salt okunur inceleme yapar.
- Worktree, ikinci checkout veya repository kopyası oluşturulmaz.
- Aynı çalışma dizininde aynı anda yalnızca bir ajan dosyalara yazabilir.
  Diğer ajanlar salt okunur inceleme yapar. API ve UI işi gerekiyorsa sıralı
  yürütülür.
- Kullanıcının mevcut değişiklikleri korunur; commit veya push yapılmaz.

## Uygulama görevi protokolü

1. “Yap, ekle, düzelt, uygula, test et” istekleri uygulama görevidir; yalnızca
   plan verip durma.
2. Spec’ler gereksinim kaynağıdır. İlgili spec ve bağımlılıkları okunmadan
   uygulama yapılmaz.
3. Worktree, ikinci checkout veya repository kopyası oluşturma.
4. Worktree kullanılmadığından aynı anda yalnızca bir ajan yazabilir; diğerleri
   salt okunur kalır.
5. Laya çok adımlı işleri sıralamak için kullanılır; sonucu bu kuralların veya
   açık kullanıcı isteğinin önüne geçmez.
6. Serena ilgili dosya ve sembolleri bulmak için kullanılır.
7. Kod varsa değişen pakette hedefli typecheck/lint/test çalıştırılır. Kod
   yoksa uygun stack ve test düzeni spec’lerden çıkarılır; kod üretimi yalnız
   açık uygulama görevinin kapsamındadır.
8. Kullanıcı akışı uygulandığında Playwright ile gerçek tarayıcıda test edilir.
   Test edilmeyen akış tamamlandı diye raporlanmaz.
9. Gereksiz tam repo testleri, tekrar eden tüm-vault okumaları ve her küçük
   değişiklikte reviewer çalıştırılması önlenir.
10. Yalnız kalıcı kararlar, gerçek bug’lar, dersler ve açık işler Medical
    Tourism brain vault’undaki Obsidian notlarına yazılır; secret, token, şifre
    veya ham `.env` değeri yazılmaz.
11. Rutin teknik tercihler mevcut spec ve mimariden çözülebiliyorsa kullanıcı
    bekletilmez. Ürün, güvenlik, hukuk veya veri etkisi ciddi olan ve
    kaynaklardan çözülemeyen kararlarda soru sorulur.
12. Kullanıcı değişiklikleri korunur. Commit veya push yapılmaz.

### Laya routing ve karar katmanı

Laya, çok adımlı görevlerde `laya_route` ve `laya_predict` ile görev sınıfı,
bağımlılık sırası ve `execution_mode` (`inspect_only`, `modify`, `unknown`)
önerir. Sonuç, route/structured decision/confidence ve execution effect ile
görev raporuna yazılır. Düşük güvenli veya proje kurallarıyla çelişen sonuç
geçersiz sayılır; güvenlik, spec statüsü ve tek-yazıcı kuralı Laya’dan üstündür.
Trivial salt-okunur işlerde Laya atlanabilir.

### MCP araçları

- `laya`: routing ve tipli kararlar.
- `serena`: dosya, sembol ve referans keşfi; kod dil sunucusu yoksa Markdown
  pattern keşfi yeterlidir.
- `playwright`: Chromium ile gerçek kullanıcı akışı doğrulaması. Uygulama veya
  çalışan site yoksa yalnız MCP bağlantısı doğrulanır; sayfa testi yapılmaz.

### Test ve kapanış

- Kod değiştiyse yalnız değişen paket için hedefli test/typecheck/lint çalıştır;
  tam repo doğrulamasını yalnız büyük entegrasyon, release, ortak paket/schema
  değişikliği veya açık kullanıcı isteğinde çalıştır.
- Uygulama akışı değiştiyse aynı akışı Playwright ile tekrar et; tarayıcı kanıtı
  yoksa sonucu tamamlandı olarak işaretleme.
- Görev sonunda şu başlıkları içeren kalıcı özet yaz: tamamlanan iş, kabul
  edilen kararlar, değişen dosyalar, doğrulama, açık sorular ve sonraki adım.
  Önce `/Users/berat/medical-tourism/medical-tourism-brain` altındaki yerel
  Medical Tourism Obsidian vault’una yaz. Ventura Brain’e veya başka global
  brain’e yazma. Uzak Obsidian Sync teslimini gözlemlemeden tamamlandı deme.
