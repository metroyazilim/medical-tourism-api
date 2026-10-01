# Medical Tourism MVP — Kısa Özet

## MVP nedir?

Medical Tourism MVP’si, uluslararası hastaların doğrulanmış sağlık kuruluşu,
doktor ve tedavi seçeneklerini keşfetmesini; tedavi talebi oluşturmasını;
yetkili klinik temsilcisiyle mesajlaşmasını; teklif, randevu ve tedavi sürecini
takip etmesini sağlayan bir sağlık turizmi platformudur.

Platform doğrudan tıbbi hizmet sunmaz. Hasta ile sağlık kuruluşu arasındaki
keşif, talep, iletişim ve süreç takibini yönetir.

## MVP’de bulunan ana akış

1. Hasta public katalogda kuruluş, doktor ve tedavi arar.
2. Hasta giriş yapar, genel rıza verir ve tedavi talebi oluşturur.
3. Talep en fazla üç uygun kuruluşa izole lead olarak yönlendirilir.
4. Yetkili klinik temsilcisi talebi inceler ve hasta ile mesajlaşır.
5. Hasta izin verdiği dosya ve bilgileri paylaşır.
6. Klinik teklif oluşturur; hasta kabul eder veya reddeder.
7. Taraflar randevu ve tedavi yolculuğunu takip eder.
8. Sistem bildirim, audit, gizlilik ve hesap silme süreçlerini yürütür.

## Güvenlik ve yönetişim sınırı

- Mesajlar sessizce silinmez; düzenlemeler kalıcı revision olarak saklanır.
- Hasta ve klinik temsilcisi yalnız güncel mesajı görür.
- Süper admin tüm mesaj ve revision geçmişini görebilir; erişimler audit edilir.
- İletişim bilgisi paylaşımı AI ile değil, sürümlü deterministik kurallarla
  taranır.
- Sağlık verisi, dosya, mesaj ve token gibi hassas değerler teknik loglara
  yazılmaz.
- Dosyalar public URL ile açılmaz; her erişim yetki kontrolünden geçer.

## MVP kapsamı dışında

- Concierge hizmet sağlayıcısı ve concierge rezervasyonu
- AI/LLM tabanlı mesaj analizi
- WhatsApp entegrasyonu
- Ödeme, uçuş/otel satış motoru ve sigorta provizyonu
- Uygulama içi görüntülü görüşme
- Referral/puan, sponsorlu reklam ve gelişmiş kampanya modülleri

## Teknik durum

- Mimari: NestJS + Fastify tabanlı modüler monolith
- Hedef kalıcı veri katmanı: PostgreSQL + Prisma
- Kimlik: Firebase Authentication
- Arka plan işleri: BullMQ + Redis
- Şu anki executable backend: local/test için in-memory adapter
- UI ve gerçek production provider bağlantıları henüz tamamlanmış değil

## Kaynaklar

- Ayrıntılı plan: `docs/mvp-project-plan.md`
- Spec sırası: `docs/spec-roadmap.md`
- Feature spec’ler: `docs/specs/`
- Mevcut uygulama durumu: `docs/progress-tracker.md`
