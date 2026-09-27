# AquaGuard — Teknik ve Ürün Denetimi / İyileştirme Yol Haritası

> **Temel amaç:** AquaGuard; su kirliliği ve su kalitesi sorunlarının ihbar, inceleme, onay ve takip süreçlerini yöneten bir uygulamadır.

## Uygulama takip listesi

### Faz 1 — Güvenlik ve mimari stabilizasyon

**Durum: Devam Ediyor**

- [x] Self-service kayıtta istemciden gelen rolü yok sayıp yeni hesabı `halk` rolüyle oluşturma.
- [x] Rol bazlı kayıt ve e-posta bildirimleri: vatandaş hesabını etkin açma; uzman/yönetici talebini onaya alma ve karar e-postası gönderme.
- [x] `/api` isteklerine ortak oturum ve rol kapısı ekleme; kritik dashboard, kanban, rapor ve onay handler'larında yetkiyi tekrar denetleme.
- [x] Firestore için varsayılan ret ve en az ayrıcalık ilkeli güvenlik kuralları hazırlama.
- [ ] Firestore erişimini sunucu tarafında Firebase Admin SDK'ya taşıma ve tarayıcıdaki doğrudan yazımları yetkili API'lere aktarma.
- [ ] Rol/izin matrisini, kaynak sahipliğini ve onay geçişlerini tüm route handler'larında doğrulayıp emulator testleriyle kanıtlama.

### Faz 2 — UX/UI ve tasarım sistemi

**Durum: Yapılacak**

- [ ] Bilgi mimarisini vatandaş rapor akışı ve operasyon ekibi inceleme kuyruğu etrafında düzenleme.
- [ ] Erişilebilir tasarım token'ları, mobil akışlar, klavye/focus ve WCAG 2.2 AA kontrollerini tamamlayıp belgelemek.
- [ ] Yükleniyor, boş, hata ve veri tazeliği durumlarını tutarlı hale getirme.

### Faz 3 — Domain modelleri

**Durum: Yapılacak**

- [ ] Rapor, ölçüm/numune, izleme istasyonu, alarm ve onay geçmişi için sürümlü domain şemaları tanımlama.
- [ ] Firestore DTO'larını domain modellerinden ayırma; birim, kaynak, ölçüm zamanı ve doğrulama metadata'sını zorunlu kılma.
- [ ] Tek kanonik rapor koleksiyonu ve atomik workflow geçişleri için migrasyon planı hazırlama.

### Faz 4 — Test ve CI

**Durum: Yapılacak**

- [ ] Auth/rol, self-service kayıt ve API mutasyonları için regresyon testleri ekleme.
- [ ] Firestore Security Rules emulator testleri ve test verisi temizliği kurma.
- [ ] Lint, typecheck, smoke, test ve production build adımlarını CI'da zorunlu hale getirme.

---

> **İnceleme kapsamı:** Depodaki Next.js App Router uygulaması, Firebase/Firestore veri erişimi, API route'ları, kimlik doğrulama, ana pano/harita akışları, bağımlılıklar ve proje dokümantasyonu. Bu belge statik kod incelemesidir; canlı Firebase projesi, gerçek kullanıcı davranışı, mevzuat uyumu ve saha sensörleri doğrulanmamıştır.
>
> **Temel ürün bulgusu:** README ve uygulama ekranları AquaGuard'ı **su kalitesi/kirlilik ihbarı ve onayı** ürünü olarak tanımlıyor. İstenen “su tasarrufu ve tüketim takibi” değer önerisi ise mevcut ölçüm modelinde yer almıyor. Bunlar ilişkili fakat farklı iş akışları ve metriklerdir. Önce hedef kullanıcıyı ve ürün vaadini seçin; tüketim tasarrufu eklenecekse bunu kalite/ihbar verisinden ayrı bir ürün modülü ve veri modeli olarak kurun.

## 1. Sistem Mimarisi & Kod Kalitesi Eleştirisi

### Doğrulanmış mimari zayıflıklar

| Öncelik | Bulgu ve kod kanıtı | Etki / öneri |
|---|---|---|
| **Kritik** | `firestore.rules`, `/users/{userId}` ve `/reports/{reportId}` için herkese `read` izni veriyor; raporlarda ayrıca herkese `write` izni, `kanban_cards` için de herkese `read/write` izni var. | Tarayıcıdan veya Firebase istemcisinden kullanıcı kayıtları, raporlar ve iş akışı yetkisi olmadan okunup değiştirilebilir. Özellikle kullanıcı belgelerinde parola özeti ve 2FA alanları tutuluyorsa veri ifşası doğrudan etkilenir. İstemci erişimini kapatıp Firebase Admin SDK'yı sunucu sınırına alın; kurallarda doğrulanmış kimlik, sahiplik ve rol bazlı en az ayrıcalık uygulayın. |
| **Kritik** | `app/register/page.tsx` rol seçtiriyor; `app/api/auth/register/route.ts` gelen `admin`, `uzman` ve `yonetici` rollerini geçerli kabul edip kullanıcıya atıyor. | Herkese açık kayıt, ayrıcalıklı hesap oluşturma yoludur. Self-service kayıt varsayılan olarak `halk` rolü vermeli; yetkili rol ataması mevcut admin tarafından davet/onay akışıyla yapılmalıdır. |
| **Kritik** | `middleware.ts` tüm `/api` yollarını atlıyor. `app/api/dashboard/route.ts` ve `app/api/kanban/route.ts` kimlik kontrolü yapmıyor; PATCH, kolon güncellemesine sunucu tarafında rol doğrulamadan izin veriyor. `app/api/kanban/approve/route.ts` daha iyi bir örnek olarak token ve onay rolünü kontrol ediyor, ancak bu yaklaşım tutarlı değil. | UI'daki `ROLE_ROUTES` / `hasAccess` güvenlik sınırı değildir. Her handler'da ortak bir `requireUser` / `requireRole` katmanı kullanılmalı; tüm mutasyonlarda kaynak sahipliği, geçiş kuralları ve şema doğrulanmalıdır. |
| **Kritik** | `lib/auth.ts` ve `middleware.ts` `JWT_SECRET` tanımsızken kaynak kodda sabitlenmiş bir fallback secret kullanıyor. `app/api/auth/login/route.ts` bu fallback'i ayrıca tekrar tanımlıyor. | Yanlış üretim yapılandırması sessizce bilinen anahtarla token imzalamaya dönüşür. Üretimde güçlü secret yoksa servis başlamamalı; tek yapılandırma modülü kullanın ve secret rotasyonu/oturum iptali planlayın. |
| **Yüksek** | `lib/dashboard.ts` örnek marker, aylık grafik, bölge dağılımı ve aktiviteyi sabit tutuyor. `app/api/dashboard/route.ts` bu veriyi API'den canlı gibi sunuyor; `DashboardClient.tsx` Firestore raporlarını ayrıca ekleyerek harita işaretçisi üretiyor. `MapPageClient.tsx` da örnek API işaretçilerini canlı raporlarla birleştiriyor. | Gerçek ve demo verisi aynı görsel dilde karışıyor, sayaçlar ve harita sayıları gerçeği yansıtmıyor; dashboard geri dönüşü olmayan yanlış operasyonel karar üretebilir. Üretimde demo verisini tamamen kaldırın; örnek veriyi yalnızca açık “Demo” ortamında kullanın. |
| **Yüksek** | Veri kaynakları tutarsız: `components/Kanban/KanbanBoard.tsx`, dashboard ve harita doğrudan Firestore `reports` dinliyor; `lib/kanban.ts` aynı zamanda ayrı bir in-memory kart deposu sağlıyor ve `app/api/kanban/route.ts` bu depoyu kullanıyor. Firestore kuralları `citizen_reports` ve `kanban_cards` için de ayrı koleksiyonlar tanımlıyor. | Serverless instance yeniden başladığında in-memory güncellemeler kaybolur; aynı iş kaydının birden fazla yerde tutulması liste, onay geçmişi ve raporlama tutarsızlığı yaratır. Tek kanonik koleksiyon + tek servis sınırı + sürümlü şema kararı verin, geçiş/migrasyon planı ekleyin. |
| **Yüksek** | `app/api/auth/login/route.ts` basit rate limit durumunu süreç içi `Map`'te tutuyor; aynı dosya girişte e-posta ve kullanıcı varlığına ilişkin `[DEBUG LOGIN]` log'u yazıyor. `lib/auth.ts` süper admin için TOTP yedek kodlarını `Math.random()` ile üretiyor. | Instance'lar arası limit uygulanmaz ve restart ile sıfırlanır; loglarda kişisel veri bulunur; güvenlik kodları kriptografik değildir. Paylaşımlı Redis/edge rate-limit, kimlik bilgisi içermeyen yapılandırılmış loglar ve `crypto` tabanlı güvenli rastgelelik kullanın. |
| **Yüksek** | `lib/types.ts`'de `User` tipi `passwordHash`, `twoFactorSecret` ve `backupCodes` taşıyor. `/users` Firestore kuralı herkese okuma izni veriyor. | Güvenli kullanıcı görünümü ile kalıcı kimlik bilgisi modeli arasındaki sınır tanımlı değil; UI'da “safe” DTO kullanımı veri tabanı güvenliğini sağlamaz. DB modelini ve `SafeUser` DTO'sunu ayrı tutun; secret alanlarını istemci veri yolundan kaldırın ve mevcut kayıtlar için olası ifşayı değerlendirin. |
| **Orta** | `components/Dashboard/DashboardClient.tsx`'te Firestore verisi `any[]` ile işleniyor, paralel veri yüklemelerinde hata sessiz fallback'e dönüşebiliyor ve `eslint-disable` ile bağımlılık kontrolü atlanıyor. `lib/auth.ts` ve API route'larında `as any` / `error: any` kullanımları var. | Derleme zamanı tipleri çalışma zamanı veri doğrulamasını karşılamıyor; alanı eksik/yanlış Firestore dokümanları harita, grafik veya onayda hataya neden olabilir. DTO'ları `unknown` girdiden şema ile doğrulayın; `strict` TypeScript'i koruyup istisnaları azaltın. |
| **Orta** | `lib/ai.ts` model cevabını doğrudan `JSON.parse` edip tip assertion yapıyor; prompt'a rapor metnini gömüyor. AI risk çıktısı su kalitesi için karar desteği olarak kullanılıyor. | Model çıktısı geçersiz/uydurma olabilir; rapor metnindeki prompt injection AI'nın çıktısını etkileyebilir. JSON şemasıyla doğrulama, uzunluk/timeout sınırı, prompt ayrıştırma, kaynak/kanıt ve insan onayı ekleyin; AI kararını ölçüm veya mevzuat gerçeği gibi sunmayın. |
| **Orta** | `components/AuthProvider/AuthProvider.tsx` auth isteği hatalarında kullanıcıyı sessizce anonim kabul ediyor; dashboard ve harita istemcilerinde de bazı hatalar konsola yazılıp boş/sabit içerikle kapatılıyor. Global `ErrorBoundary` mevcut olsa da API hata sözleşmesi tek tip değil. | Kullanıcı “veri yok” ile “veri alınamadı” durumunu ayıramaz; destek/izlenebilirlik zayıflar. Ortak hata kimliği, tipli API hata gövdesi, merkezi log/izleme ve ekran bazlı yükleniyor/boş/hata/yeniden dene durumları oluşturun. |
| **Orta** | `README.md` teknoloji rozetlerinde Next.js 15 yazar; `package.json` Next.js 16.3.0 kullanıyor. README'deki klasör ağacında `lib/gemini.ts` anlatılırken gerçek dosya `lib/ai.ts`; ayrıca “gerçek zamanlı” anlatımın aksine pano metrikleri hard-coded. | Kurulum ve mimari dokümantasyonu güvenilirliğini kaybeder, değişiklikler hatalı beklenti yaratır. README'yi çalışan kod ve kilitli sürümlerle senkronize edin; canlı veri / demo verisi ayrımını açıkça belgeleyin. |

### Kaldırma / sadeleştirme kararları

- **`lib/kanban.ts` içindeki in-memory örnek kart deposunu** Firestore/tek kalıcı veri kaynağına geçiş tamamlandıktan sonra kaldırın. Bugünkü çift kaynak yapısını koruyup “temizlik” adıyla erken silmek gerçek akışı bozabilir.
- **`framer-motion` doğrudan bağımlılığı** uygulama kaynak kodunda kullanılmıyor (kullanım taramasında sadece `package.json` / kilit dosyasında bulundu); tasarımda animasyon ihtiyacı yoksa kaldırın. Önce `npm uninstall framer-motion`, ardından lint/build ile doğrulayın.
- **`supercluster` doğrudan bağımlılığı** kaynakta doğrudan import edilmiyor; harita `use-supercluster` kullanıyor. Kümelendirme kütüphanesi `use-supercluster`'ın transitive gereksinimiyse yalnızca doğrudan bağımlılık bildirimini kaldırmayı değerlendirin; harita testinden sonra kilit dosyasını güncelleyin.
- **`scripts/test.ts`** otomatik test değil; Firestore'a `test-doc` yazan manuel bağlantı denemesi ve `package.json`'da test komutu da yok. Bunu güvenli, açıkça adlandırılmış `smoke` komutuna dönüştürün veya kaldırıp gerçek test runner kurun; üretim projesinde belirsiz “test” betiği bırakmayın.
- **`public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg`** uygulamada kullanılmıyorsa Next starter kalıntıları olarak kaldırılabilir. Önce path referansı taraması yapın.
- `@types/bcryptjs`, `@types/jsonwebtoken` ve diğer geliştirme bağımlılıklarını yalnızca kilitli paketlerin kendi tip tanımları ve typecheck doğrulandıktan sonra gereksiz oldukları kanıtlanırsa temizleyin. **Paketleri yalnızca “fazla görünüyor” diye kaldırmayın.**

### Eklenmesi gereken mimari temel

1. **Güven sınırı:** Firebase Admin SDK yalnızca server-only modüllerde; tarayıcıda doğrudan DB yazımı yok. Her koleksiyon için tenant/owner/role bazlı Firestore Security Rules ve Rules Unit Testing.
2. **Kimlik ve yetki:** kayıt rolü `halk`; admin rolleri davetle atanır. Tek `getSession()` / `requireRole()` middleware yardımcısı, açık izin matrisi ve her API route'unda zorunlu kullanım. JWT secret boot-time kontrolü, standart cookie ayarları, 2FA challenge'ın tamamlanmadan uygulama oturumu sayılmaması.
3. **Doğrulanmış sözleşmeler:** API request/response ve Firestore dokümanları için Zod benzeri runtime şema; ayrı persistence entity, domain type ve `SafeUser` / API DTO'ları. Geçersiz ölçüm/koordinat/tarih reddedilsin.
4. **Domain/service katmanı:** `reports`, `measurements`, `monitoring-stations`, `alerts`, `users` gibi iş modülleri; route handler yalnızca auth → validate → use-case → response akışı yürütmeli. Bir onay geçişi rol, mevcut durum ve audit kaydını tek atomik transaction ile kontrol etmeli.
5. **Hata ve operasyon:** ortak `ApiError` kodları; structured logging, PII redaksiyonu, correlation ID; Sentry/OpenTelemetry benzeri hata ve gecikme izlemesi. Hata asla demo verisi döndürerek başarı gibi gizlenmemeli.
6. **Sürdürülebilir veri:** Firestore indeksleri/sayfalama, `createdAt`/`measuredAt`/`updatedAt` zamanlarının tutarlı saklanması, birim ve kaynak metadata'sı, audit trail, saklama ve dışa aktarma politikası. Büyük zaman serileri için retention/rollup maliyet planı.

## 2. UX & UI Tasarım Sistemi Analizi

### Bilgi mimarisi ve ana akışlar

- Mevcut navigasyon (`components/Sidebar/Sidebar.tsx`) rapor panosu, Kanban, harita, AI analizi ve yönetim ekranlarını eşit seviyede listeliyor; bu, vatandaşın günlük hedefini “sorun bildir → konumu/kanıtı ekle → durumunu takip et” akışında görünür kılmıyor. Vatandaş için **Rapor oluştur**, **Raporlarım**, **Harita**; uzman/yönetici için **İnceleme kuyruğu**, **Kritik olaylar**, **Ölçüm istasyonları** öncelikli olmalı.
- Kayıt ekranı rol seçtirdiği için katılım akışına gereksiz karar yükü ekliyor ve ayrıcalık riskine yol açıyor; rol seçimini kaldırıp vatandaş kayıt formunu sadeleştirin. Uzman onboarding'i davet bağlantısıyla ayrı yürüsün.
- Bir raporun durumunu görmek için Kanban'ı anlamak zorunlu olmamalı. Vatandaşa kronolojik durum geçmişi, beklenen sonraki adım, sorumlu birim, son güncelleme zamanı ve eksik kanıt varsa düzeltme aksiyonu sunun.
- Rapor oluşturma idealde 3 adımdan uzun olmamalı: **konum** (haritada pin/adres, koordinat doğrulama), **olay ve kanıt** (kategori, açıklama, fotoğraf/ölçüm + birim), **önizle ve gönder**. Taslak kaydı, mobil fotoğraf yükleme, açık konum izni ve adres doğrulama başarısızlığı için manuel harita pini ekleyin.
- Gerçek ürün su **tüketim tasarrufu** ise ayrı onboarding gerekir: hane/tesis/tesisat seçimi, sayaç bağlama veya başlangıç-bitiş okuması, sakin/çalışma takvimi ve hedef. Su kirliliği ihbarı ile tüketim akışlarını aynı formda birleştirmeyin.

### Dashboard: göstergeyi eyleme bağlama

Şu anki pano `Toplam Rapor`, `Bekleyen Onay`, `Ortalama Risk Skoru`, `Bu Ay Yayınlanan` ile örnek trend ve bölge verileri gösteriyor. Toplam rapor ve yayınlanan sayısı tek başına kaynak kalitesi iyileşmesini ya da tasarrufu kanıtlamaz; örnek veri canlıymış gibi görünmemelidir.

**Su kalitesi izleme odağında**, ilk ekranda:

- En son ölçüm zamanı ve veri tazeliği (ör. son 24 saatte gelen istasyon oranı), çevrimdışı/kalibrasyon uyarısı.
- Eşik üstü istasyonlar: parametre, ölçüm değeri + birim, eşik kaynağı, ölçüm zamanı, konum ve güven/kalite bayrağı.
- Kritik açık olay sayısı, kritik olayın yaşı, ilk müdahaleye kadar süre, açık/kapalı olayların bölgesel kümelenmesi.
- Parametre bazlı zaman serisi ve istasyon/konum filtreleri; pH, çözünmüş oksijen (mg/L), bulanıklık (NTU), sıcaklık (°C), gerekiyorsa iletkenlik/nitrat gibi parametreler ayrı eksen ve birimleriyle.
- Kaynak kalitesi trendi için örneklem sayısı, dönem, yöntem ve veri kapsamı birlikte; “ortalama risk skoru” tek başına çevresel kalite ölçüsü değildir.

**Gerçek su tasarrufu odağı seçilirse**, kalite risk skorları tasarruf panosunun ana metriği olmamalı. Öne alınması gerekenler:

- Tüketim (L/kişi/gün veya m³/tesis/gün), ölçüm kapsamı/tazeliği ve tarih aralığı.
- Hava/kişi/üretim hacmi gibi karşılaştırma faktörlerine göre normalleştirilmiş tüketim ve aynı dönem baz çizgisine farkı.
- Kaçak olasılığı: olağan dışı gece taban akışı, sürekli debi, eşik üstü debi ve etkilenen süre; “tahmini” olduğu açıkça yazılmalı.
- Bütçe/hedefe göre gidişat, tahmini dönem sonu tüketimi, aksiyon sonrası doğrulanmış tasarruf (ölçülen baz çizgi ve gerçekleşen değerle).
- Birim maliyet/şebeke suyu/yeniden kullanım payı ancak kaynak verisi ve yerel tarife tanımlıysa gösterilmeli.

**Grafik ve harita davranışı:** risk ve rapor sayısını aynı eksende çizmek farklı ölçü birimlerini yanıltıcı biçimde kıyaslar; ayrı grafik/eksen kullanın. Demo marker'ları canlı raporlardan ayrı etiketleyin. Harita pinine son ölçüm, kaynak, güven, zaman ve açılır aksiyon ekleyin; sadece renk üzerinden alarm seviyesi anlatmayın.

### Görsel sistem, erişilebilirlik ve mobil kullanım

- `app/globals.css` koyu, neon cyan/yeşil ve glow ağırlıklı bir görsel dil tanımlıyor. Sunum ekranında ayırt edici olsa da sürekli kullanılan analitik üründe parıltı/renk yoğunluğu verinin okunurluğunu düşürür. Daha nötr yüzey, tek ana vurgu rengi, semantik risk renkleri ve açık/koyu temada doğrulanmış kontrast tokenları kullanın.
- Renk tek başına anlam taşımamalı: risk etiketinde metin, ikon/şekil ve renk beraber; grafiklerde desen/legend; haritada klavye erişilebilir liste alternatifi de olmalı. WCAG 2.2 AA kontrastını, klavye odağını, görünür focus, modal focus trap, etiketli alanları, ekran okuyucu duyurularını ve 200% zoom'u test edin.
- CSS'te `prefers-reduced-motion` kuralı görünmüyor; sürekli pulse/glow ve hareketli dekoratif katmanları azaltılmış hareket tercihinde kapatın. `body::before` gibi dekoratif katmanların okunabilirliğe ve düşük güçlü mobil cihazlara maliyetini ölçün.
- Tasarım tokenlarını renk, tipografi, boşluk, radius, elevation, katmanlama ve durumlar için tek kaynakta tutun; ortak Button/Input/Badge/Alert/Modal/Table/EmptyState bileşenlerine varyant ve durum sözleşmesi ekleyin. Inline `style` ile çoğalan rastgele renk ve ölçüleri token'lara taşıyın.
- Dashboard'un çok sayıdaki kart/grafiği küçük ekranda özetlenebilir ve dikey akışta önceliklendirilebilir olmalı; navigasyon mobil drawer/bottom bar, grafikler yatay kaydırılabilir veya metinsel özetli, tablolar kart/list view destekli olmalı. Dokunma hedefi en az 44×44 CSS px olacak şekilde tasarlayın.
- İlk yüklemede yalnızca spinner göstermek yerine iskelet, boş (henüz ölçüm yok), stale/offline, permission denied ve tekrar dene durumlarını ayırın. Grafik/harita için erişilebilir metin özeti ve veri indirme seçeneği ekleyin.

## 3. Özellik (Feature) ve Ürün Kapsamı Boşluk Analizi

### Önce ürün kapsamını sabitleyin

Bugünkü kanıtlar (README, `lib/kanban.ts`, `lib/dashboard.ts`, `components/MapPage/MapPageClient.tsx`) **su kalitesi olayı bildirimi, AI ile ilk sınıflandırma, uzman/yönetici onayı ve haritada yayınlama** akışını destekliyor. “Su tasarrufu/tüketim takip uygulaması” için sayaç okuması, tüketim zaman serisi, hane/tesis, kişi sayısı, baz çizgi veya tasarruf hesabı modeli görülmüyor. Bu nedenle projeye ait mevcut tasarruf metriği ya da global rakiplere göre doğrulanmış feature parity iddiası üretilemez.

Ürün karar kapısı:

1. **İlk hedef su kalitesi/ihbar ise:** kalite istasyonu, laboratuvar/sensör ölçümü, olay ve müdahale sürecini derinleştirin; tüketim azaltma rozetlerini ana ürüne eklemeyin.
2. **İlk hedef tüketim tasarrufu ise:** dashboard ve bilgi mimarisini sayaç/tüketim/baz çizgi etrafında yeniden kurun; kirlilik ihbarı ve risk onayını ayrı operasyonel modül yapın veya ürün kapsamı dışına alın.
3. İki hedef de stratejikse ortak platformda ayrı persona, veri modeli, gezinme alanı ve başarı metriğiyle modülerleştirin; tek metrik sözlüğüne zorlamayın.

### Yüksek değerli özellik boşlukları

**Su kalitesi / kaynak izleme için:**

- İstasyon ve sensör envanteri; koordinat, su kütlesi/havza, parametre, ölçüm birimi, üretici, kalibrasyon ve bakım zamanı.
- Zaman damgalı ölçüm serisi, kaynak türü (sensör/lab/kullanıcı bildirimi), numune yöntemi, kalite bayrağı, kalibrasyon durumu ve ölçüm güvenilirliği.
- Eşik ve trend tabanlı alarm: parametreye/konuma göre eşik, sürdürülen ihlal süresi, histerezis, tekrar bastırma, önem seviyesi, atama ve ack/escalation.
- Bildirim tercihleri ve abonelik: kritik alarm için uygulama/e-posta; kullanıcı başına gürültü kontrolü ve sessiz saatler. SMS/push ancak operasyonel ihtiyaç ve izinler doğrulanınca.
- Olay yaşam döngüsü ve kanıt: fotoğraf/ek, koordinat, tekrar eden olay ilişkilendirme, sorumlu birim, SLA, uzman notu, karar gerekçesi ve denetlenebilir durum geçmişi.
- Filtrelenebilir zaman aralığı, havza/istasyon/parametre, karşılaştırma ve CSV/PDF dışa aktarma; rapora ölçüm kaynağı, birim, veri kapsamı ve üretilme zamanını dahil etme.
- Harita kümelendirme, ölçüm kapsamı/son veri zamanı katmanı ve erişilebilir liste görünümü; kamuya açık ve hassas konumların yayın politikasını ayırma.
- AI yalnızca açıklanabilir karar desteği: kaynak metrikleri, eksik veri uyarısı, model sürümü ve uzman onayı; AI skorunu resmi laboratuvar sonucu veya mevzuat ihlali olarak sunmama.

**Su tüketim/tasarruf hedefi seçilirse ayrıca:**

- Sayaç entegrasyonu (API/IoT) veya doğrulanabilir manuel okuma; tesis/konum/alt sayaç hiyerarşisi ve veri boşluğu yönetimi.
- Gün/hafta/ay tüketimi, karşılaştırılabilir tarih aralığı, mevsimsellik ve kişi/üretim başına normalizasyon.
- Bütçe ve hedef belirleme, kaçak/ani tüketim uyarısı, kapatılabilir bildirimler ve doğrulanabilir tasarruf hesabı.
- Çoklu konum/tesis, rol ve lokasyon bazlı erişim; fatura/tarife ve birim tercihleri yalnızca ihtiyaç varsa.
- Gamification yalnızca ölçümle doğrulanan ve eşit şartlarda karşılaştırılabilen aksiyonu ödüllendirsin; hane/kurum veya gelir farklarını teşvik panosunda ifşa etmeyin.

### Basitleştirilecek / ertelenecekler

- **AI sohbet ve genel amaçlı AI analizi:** ölçülmüş iş akışına bağlı değilse ana navigasyonda öncelik vermeyin. AI'yı olay sınıflandırma ve uzman iş yükü desteğiyle sınırlayın; deterministik eşik ve insan kararının önüne koymayın.
- **Sabit sayı rozetleri ve sahte aktivite:** Sidebar'daki hard-coded `12` / `3`, `lib/dashboard.ts` örnekleri ve eski tarihli ölçümler canlı veriye bağlanana kadar kaldırılmalı veya belirgin demo etiketi taşımalı.
- **Mail şablonları/yönetim menüsü:** sadece gerçek operasyonel admin ihtiyacı için; vatandaş ve uzman akışını kalabalıklaştırmamalı.
- **Gamification:** ilk sürümün kritik bağımlılığı değildir. Temel ölçüm kalitesi, alarm doğruluğu ve tasarrufun doğrulanması oturmadan rozet/sıralama eklemek vanity metric ve yanlış teşvik üretir.
- **İki ayrı onay adımı:** yasal/kurumsal süreç gereği değilse her düşük riskli bildirimi uzman + yönetici onayına sokmak yayın süresini uzatır. Risk, doğrulanmış kaynak ve güvene göre kademeli inceleme; kritik olayda hızlı insan teyidi tasarlayın.
- `README`'de iddia edilen “gerçek zamanlı”, “otomatik” ve “kusursuz responsive” gibi ifadeleri çalışan, gözlemlenebilir ve test edilmiş davranışla doğrulanmadan ürün vaadi olarak kullanmayın.

## 4. Yapılandırılmış Aksiyon Planı ve Fazlar (`yapilacaklar.md`)

> **Sıralama ilkesi:** Faz 1'deki güvenlik ve ürün doğruluğu engelleri kapanmadan yeni kullanıcı/AI özelliklerini büyütmeyin. Her iş maddesi için PR, test ve sahibi ayrı atanmalı.

### Faz 1 — Acil Temizlik ve Mimari Stabilizasyon

| Öncelik | Aksiyon / tamamlanma ölçütü |
|---|---|
| **High / P0** | Self-service kayıt rolünü `halk` ile sabitleyin; rol parametresini kabul etmeyin. Admin/uzman atamasını mevcut admin tarafından davet/onay akışına taşıyın. Test: anonim kayıt body'sinde `admin` gönderilse de ayrıcalık verilmiyor. |
| **High / P0** | Firestore Rules'ı deny-by-default yapın; `users`, `reports`, `citizen_reports`, `kanban_cards` için kullanıcı/owner/rol ve geçerli alan bazlı erişim kurgulayın. Sunucu yazımları Admin SDK'ya alın. Emulator Rules testleri: anonim okuma/yazma, yatay kullanıcı erişimi ve yetkisiz rol değişikliği başarısız. |
| **High / P0** | Tüm `/api` handler'larına ortak oturum ve rol yetkisi uygulayın; dashboard verisini kullanıcı/rol kapsamına göre verin. PATCH/approve/reject için geçerli state transition, payload şeması ve atomik audit kaydı doğrulayın. Test: anonim ve yanlış rolde 401/403; yetkili işlem doğru durum + tek audit event üretir. |
| **High / P0** | `JWT_SECRET` ve `SUPER_ADMIN_PASSWORD` gibi zorunlu secret'ları üretimde fail-fast doğrulayın; hard-coded fallback'i kaldırın. Giriş log'undan e-posta/credential göstergelerini kaldırın; paylaşımlı rate limit, login başarısızlığında aynı yanıt ve kriptografik backup-code üretimi ekleyin. |
| **High** | Ürün kapsamı kararını ADR/ürün gereksinimi olarak kaydedin: (A) kalite/ihbar, (B) tasarruf/tüketim, (C) iki modül. İlk persona, ana görev, veri sağlayıcısı ve North Star metriği tanımlanmadan yeni özellik başlatmayın. |
| **High** | Firestore tek kaynak/şema planını çıkarın. In-memory Kanban verisini, örnek dashboard verisini, `reports` ile paralel koleksiyonları tek seferde silmeden önce tüketicileri belirleyin; veri migrasyonu ve geri dönüş adımı ekleyin. |
| **Medium** | `framer-motion` ve doğrudan `supercluster` bağımlılıklarını kullanım teyidiyle kaldırın; starter SVG'leri temizleyin. Paket kaldırma öncesi/sonrası build ve harita davranışını doğrulayın. `scripts/test.ts` dosyasını gerçek test değil smoke olarak yeniden adlandırın veya değiştirin. |
| **Medium** | Firestore DTO/runtime şeması, ortak auth helper, ortak API hata zarfı ve log redaksiyonu ekleyin. `any` / `as any` ve eslint-disable kullanımını modül modül azaltın. |
| **Medium** | `README.md`, `package.json` sürümleri, gerçek klasör yapısı, gerçek zamanlı akış ve demo veri durumu ile hizalansın. |

**Faz 1 çıkış kapısı:** istemci doğrudan yetkisiz veri okuyup yazamıyor; tüm API mutasyonları auth/role/state kontrolünden geçiyor; public register ayrıcalık atayamıyor; demo verisi canlı gibi görünmüyor; tek kanonik rapor kaynağı ve geçiş planı belgelenmiş.

### Faz 2 — UX/UI ve Tasarım Sistemi Revizyonu

| Öncelik | Aksiyon / tamamlanma ölçütü |
|---|---|
| **High** | Persona bazlı gezinme tasarla: vatandaşın rapor oluşturma/takip görevi, uzmanın inceleme kuyruğu, yöneticinin kritik olay/SLA görünümü. Hedef görev kullanılabilirlik testinde kullanıcıların en az %90'ı yardım almadan tamamlasın. |
| **High** | Rapor oluşturmayı mobil öncelikli konum → olay/kanıt → önizleme akışına indir; form kaybı, hatalı koordinat ve yükleme hatasında kurtarma sağla. Mobil genişliklerde ve klavyeyle uçtan uca test et. |
| **High** | Dashboard'u rol ve ürün kararına göre yeniden kur. KPI kartında tanım, dönem, birim, kaynak ve güncellik göster; her alarm doğrudan filtrelenmiş detay/aksiyona gitsin. Sabit KPI ve demo activity kaldırılmış olmalı. |
| **Medium** | Token tabanlı görsel dil ve ortak bileşenler oluştur; risk renkleri, metin etiketleri ve kontrast WCAG 2.2 AA'ya uygun doğrulanmalı. Odak görünürlüğü, ekran okuyucu, klavye, az hareket ve 200% zoom testleri ekle. |
| **Medium** | Harita için aynı işaretçiyi iki kez saymayan tek veri sorgusu, zaman/parametre filtresi, kümelendirme, veri tazeliği ve erişilebilir sonuç listesi ekle. |
| **Medium** | Her sayfada loading/empty/error/stale/offline durumları, tekrar dene aksiyonu ve kullanıcıya anlaşılır geri bildirim sun; grafik verisine metinsel özet ekle. |
| **Low** | Animasyon ve gamification kararlarını kullanıcı testi/ürün metriğiyle doğrula; görsel efektleri varsayılan olarak azalt, tercih edilen hareket ayarına saygı göster. |

**Faz 2 çıkış kapısı:** ana persona görevleri mobil/masaüstünde başarıyla tamamlanıyor; dashboard metrikleri gerçek kaynak ve dönem bilgisine dayanıyor; WCAG AA kritik kriterleri otomatik + manuel testten geçiyor.

### Faz 3 — Yeni Nesil Özellik Entegrasyonları

| Öncelik | Aksiyon / tamamlanma ölçütü |
|---|---|
| **High** | Karara göre domain modelini kur. Kalite ürünü için `station`, `measurement`, `incident`, `alert`, `review/audit`; tüketim ürünü için ayrıca `meter`, `reading`, `site`, `baseline`, `target` varlıkları ve birim sözlüğü. Her ölçüm `value`, `unit`, `measuredAt`, `source`, `qualityFlag`, konum ve cihaz/numune referansı taşır. |
| **High** | Ölçüm eşikleri, kaynağı, yürürlük tarihi ve birimi olan konfigürasyon; sensör/laboratuvar/manual data ingestion; tekrar kayıt idempotency, geç gelen veri ve kalibrasyon durumu desteği ekle. |
| **High** | Bildirim motoru: ölçüm eşiği/trend, severity, debounce/histerezis, deduplication, atama, ack, escalation ve kanal tercihleri. Test: gürültülü sensör tek olay üretir; çözüm sonrası tekrar alarm koşulu tanımlı. |
| **Medium** | Filtrelenebilir grafikler ve CSV/PDF dışa aktarma; rapor çıktısında ölçüm kaynağı, birim, zaman aralığı, kapsama ve veri kalite uyarısı. |
| **Medium** | Çoklu lokasyon/istasyon ve rol kapsamı; harita, liste ve zaman serisi filtrelerini aynı URL state/parametreleriyle tutarlı hale getir. |
| **Medium** | AI karar desteğini güvenli şema, model sürümü, prompt/version kaydı, timeout, maliyet limiti ve uzman onayıyla sun. AI olmayan deterministik iş akışı da çalışmaya devam etsin. |
| **Low** | Gamification/rozet ve kullanıcıya özel tasarruf tavsiyesi; ancak baz çizgi, veri kalitesi ve aksiyon sonrası ölçülen etki doğrulandıktan sonra kontrollü deney yap. |

**Faz 3 başarı ölçütleri:** ürün tipine göre tanımlı North Star metriği (ör. güncel ölçümü olan istasyon kapsamı, kritik alarmın ack süresi veya doğrulanmış L/kişi/gün azaltımı); alarm yanlış pozitif oranı; ölçüm tazeliği; dışa aktarma ve görev tamamlama oranı. Başlangıç değeri ölçülmeden hedef tasarruf yüzdesi vaat edilmemeli.

### Faz 4 — Test, Güvenlik ve Canlıya Hazırlık

| Öncelik | Aksiyon / tamamlanma ölçütü |
|---|---|
| **High / P0** | CI'da `lint`, `tsc --noEmit`, unit, API/integration, Firestore Rules emulator ve production build zorunlu; main'e başarısız testle merge engelli. Şu anda `package.json` test script'i ve eşleşen test dosyası görülmüyor; gerçek test altyapısı kurulmalı. |
| **High / P0** | Auth/role, kayıtta rol yükseltme, Firestore Rules, API mutasyonları, onay state machine, AI geçersiz cevabı, rate limit ve veri sahipliği için negatif güvenlik testleri. OWASP ASVS/Top 10'a göre threat model ve yetkisiz erişim regresyonları. |
| **High** | Secret taraması, dependency vulnerability ve lisans kontrolü; CSP ve güvenlik header'larını gerçek Leaflet/harita kaynaklarına göre test et. `X-XSS-Protection` modern tarayıcıda güvenlik kontrolü sayılmamalı; CSP'yi nonce/hash ve ihtiyaç duyulan kaynaklarla tasarlayın. |
| **High** | Test ve production Firebase projelerini ayır; deploy onayı/geri alma, Firestore rules/index migration, backup/restore provası, retention ve maliyet bütçesi belirle. |
| **High** | SLO/operasyon panosu: API p95 gecikmesi, hata oranı, auth başarısı, ölçüm ingest gecikmesi, stale station oranı, alert teslim/ack süresi, AI maliyeti. Alarm sahipliği ve olay müdahale runbook'u ekle. |
| **Medium** | E2E senaryoları (kayıt/giriş, vatandaş raporu, uzman incelemesi, vatandaş takibi, alarm/dışa aktarma); küçük ekran, klavye ve erişilebilirlik smoke testleri. |
| **Medium** | Yük ve maliyet testleri: çok sayıda marker/ölçüm, Firestore listener sayısı, sorgu indeksi, sayfalama, harita cluster, günlük mail/AI kotası. |
| **Medium** | Veri kalitesi ve gizlilik incelemesi: konum ve kullanıcı bilgisi minimizasyonu, saklama/silme, anonimleştirme, fotoğraf erişimi, KVKK bilgilendirme ve gerekli rıza/izin akışları. |
| **Low** | Kademeli rollout/feature flag, kullanıcı geri bildirimi ve ürün analitiği olay sözlüğü; Mixpanel'e hassas rapor açıklaması, konum veya ölçüm ayrıntısı göndermeyin. |

**Canlıya çıkış kapısı:** güvenlik testleri ve Rules testleri yeşil; kritik/high açık zafiyet yok; geri yükleme/rollback denenmiş; gerçek veride alarm ve metrik doğruluğu iş sahibi tarafından kabul edilmiş; izleme ve olay müdahalesi sorumluları atanmış.

## İlk sprint için önerilen sıra

1. Kayıtta rol yükseltmeyi kapat ve `/api` erişimlerini merkezi auth/role ile kilitle.
2. Firestore rules'ı kapatıp Admin SDK ve emülatör testleriyle kontrollü yeniden aç; kullanıcı belgelerindeki hassas alanları koru.
3. Dashboard/harita demo verisini canlıdan ayır; rapor/kanban veri kaynağını tekleştirme kararını ver.
4. Ürün kapsamı/persona kararını imzala; gerçek ölçüm ve başarı metriği olmadan AI/gamification kapsamını büyütme.
5. CI test altyapısı ve temel erişilebilirlik/görev testlerini ekle; ardından Faz 2-3'e ilerle.
