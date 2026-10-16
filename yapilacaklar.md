# AquaGuard — Ürün ve Teknik Yol Haritası

> **Ürün amacı:** Su kirliliği ve su kalitesi bildirimlerini, izleme verilerini, inceleme/onay adımlarını ve halka geri bildirimi yönetmek. Su tüketimi/tasarrufu analitiği bu sürümün kapsamı değildir.

## Durum özeti

AquaGuard, Next.js 16 ve TypeScript kullanan, yerel SQLite veritabanına (`better-sqlite3`) dayalı bir uygulamadır. Kullanıcılar, raporlar, izleme istasyonları, ölçümler, eşikler ve istasyon uyarıları için temel veri yapıları mevcuttur. Oturumlar imzalı JWT ile, parola saklama bcrypt ile yürütülür.

**Dağıtım sınırı:** Mevcut SQLite yaklaşımı tek makinede çalışan tek uygulama örneği içindir. Birden fazla sunucu örneği veya serverless dağıtım hedefleniyorsa önce veritabanı/dağıtım mimarisi değiştirilmelidir.

Bu belge, mevcut uygulamayı üretim öncesi olgunlaştırmak için yapılacak işleri öncelik ve tamamlanma ölçütleriyle sıralar. Kodda bulunması, tek başına güvenlik veya kullanıcı kabul testinden geçtiği anlamına gelmez; tamamlandı işaretleri test kanıtıyla güncellenmelidir.

## Öncelik anahtarı

- **P0 — Kritik:** Üretimden önce tamamlanmalı; güvenlik, veri bütünlüğü veya veri kaybı riski.
- **P1 — Yüksek:** Operasyonel güvenilirlik ve temel kullanıcı akışları için gerekli.
- **P2 — Orta:** Kullanılabilirliği, gözlemlenebilirliği ve sürdürülebilirliği artırır.
- **P3 — Düşük:** Temel akışları etkilemeyen iyileştirmeler.

## Faz 1 — Mimari stabilizasyon ve veri güvenliği

**Hedef:** Tek bir güvenilir veri kaynağı, kontrollü rol yetkileri ve kaybolmayan/açıklanabilir hata davranışı.

### P0 — Uygulamadan önce

- [ ] Kimlik doğrulama ve yetkilendirmeyi tüm API route'larında envanterle; her handler'da ortak oturum ve rol yardımcılarının kullanıldığını doğrula.
- [ ] Self-service kaydın yalnızca `halk` hesabı oluşturduğunu; `uzman`, `yonetici`, `admin` ve `super_admin` rollerinin istemci girdisiyle atanamadığını doğrula.
- [ ] Kullanıcı yönetimi, rapor onaylama/reddetme, arşiv ve ölçüm/istasyon mutasyonları için rol bazlı API testleri yaz.
- [ ] `JWT_SECRET` eksik veya zayıf olduğunda uygulamanın güvensiz bir varsayılanla çalışmadığını doğrula; yerel ve üretim yapılandırmasını ayır.
- [ ] `.env.local`, SQLite veritabanı, SQLite WAL/SHM dosyaları ve yedeklerin sürüm kontrolü dışında olduğunu doğrula.
- [ ] Rapor durum geçişlerini sunucuda geçerli önceki durum, hedef durum ve yetkili rol üzerinden doğrula; eşzamanlı güncellemelerde veri kaybını önle.
- [ ] Hassas alanların (`passwordHash`, 2FA sırları/yedek kodları ve oturum belirteçleri) API yanıtlarına veya loglara sızmadığını test et.

### P1 — Veri bütünlüğü ve katmanlar

- [ ] Rapor, kullanıcı, ölçüm ve istasyon verileri için tek kanonik SQLite modelini koru; istemci tarafında veritabanı erişimi oluşturma.
- [ ] Route handler akışını `oturum → yetki → girdi doğrulama → servis/repository → tipli yanıt` biçiminde tutarlılaştır.
- [ ] HTTP isteği, JWT claim'leri ve SQLite'tan okunan JSON değerlerini çalışma zamanında doğrula; geçersiz veriyi sessizce varsayılan değere dönüştürme.
- [ ] Rapor durum değişiklikleri için aktör, zaman, önceki/yeni durum ve açıklama içeren denetlenebilir geçmiş (audit trail) tasarla.
- [ ] İstasyon ölçümlerinde parametre, değer, birim, kaynak, ölçüm zamanı ve kalite/doğrulama bilgisini zorunlu kıl.
- [ ] Veritabanı şema değişikliklerini numaralı ve geri alınabilir/tekrarlanabilir migrasyonlarla yönet.

### P2 — Hata yönetimi ve bakım

- [ ] API hata yanıtlarını ortak hata kodu ve istek kimliğiyle standartlaştır; kişisel/veri güvenliği hassas bilgileri loglardan çıkar.
- [ ] İstemcide yükleniyor, boş, hata ve yeniden dene durumlarını birbirinden ayır; ağ hatasını “kayıt yok” gibi göstermeme.
- [ ] Kullanıcı listeleri, raporlar ve ölçümler için sayfalama, filtreleme ve sınırları tanımla.
- [ ] Bağımlılıkları kullanım kanıtı ve test sonuçlarıyla gözden geçir; yalnızca kullanılmadığı ve kaldırılmasının güvenli olduğu doğrulanan paketleri temizle.

**Faz 1 tamamlanma ölçütü:** Yetkisiz API işlemleri 401/403 ile reddedilir; tüm kritik mutasyonlarda girdi ve durum geçişi doğrulanır; veritabanı yedeği/geri yükleme prosedürü denenmiştir; ilgili testler CI'da geçer.

## Faz 2 — UX, bilgi mimarisi ve erişilebilirlik

**Hedef:** Vatandaşın ihbar vermesini, ekiplerin de olayları doğru sırada inceleyip sonuçlandırmasını kolaylaştırmak.

### P1 — Temel akışlar

- [x] Vatandaş ve operasyon navigasyonunu ihbar bildirimi, ihbar takibi, doğrulama panosu, kirlilik haritası ve yetkili sistem yönetimi etrafında sadeleştir.
- [ ] Kanonik `WaterIncident` alanlarını SQLite modeline ve rapor API'sine aşamalı migrasyonla bağla; eski kayıtları koru.
- [ ] Vatandaş navigasyonunda **İhbar Bildir**, **İhbar Takip** ve **Kirlilik Haritası** eylemlerini görünür kıl; iç operasyon menülerini vatandaş akışından ayır.
- [ ] Rapor oluşturmayı konum, gözlem/kanıt ve gönderim özeti adımlarına böl; koordinat yoksa raporun haritada gösterilmeyeceğini kullanıcıya açıkça bildir.
- [ ] Raporlarım ekranında mevcut durum, son güncelleme, kronolojik işlem geçmişi ve kullanıcıdan beklenen sonraki adımı göster.
- [ ] Uzman ve yönetici panolarında rolün sorumluluklarına göre atanmış/bekleyen iş kuyruğu, öncelik ve SLA yaşını öne çıkar.
- [ ] Her kritik ekranda yükleniyor, boş, hata ve veri güncelliği durumları için anlaşılır tasarım uygula.

### P2 — Tasarım sistemi ve etkileşim

- [ ] Renk, tipografi, boşluk, katman, odak halkası ve durum renklerini merkezi tasarım token'larına taşı.
- [ ] Harita işaretçisini etkileşimli yap: seçildiğinde rapor özeti ve ilgili detay/aksiyon açılsın; haritanın yanında klavye ile erişilebilir liste alternatifi bulunsun.
- [ ] Dashboard kartları, grafikler ve filtreleri aynı tarih aralığı ve veri kaynağıyla çalıştır; tıklanabilir metrikleri ilgili filtreli listeye bağla.
- [ ] Küçük ekran, klavye kullanımı, görünür focus, modal focus yönetimi, ekran okuyucu duyuruları ve %200 yakınlaştırma kontrollerini tamamla.
- [ ] WCAG 2.2 AA kontrast ve reduced-motion davranışını otomatik/manuel kontrollerle doğrula.
- [ ] Grafiklerde ölçüm birimini, zaman aralığını, örneklem sayısını ve veri tazeliğini göster; farklı birimleri aynı eksende kıyaslama.

**Faz 2 tamamlanma ölçütü:** Vatandaş yeni raporu mobilde tamamlayabilir ve durumunu bulabilir; operasyon kullanıcısı rolüne uygun kuyruğa doğrudan ulaşır; temel akışlar klavye ve ekran okuyucuyla kullanılabilir.

## Faz 3 — Ürün özellikleri ve operasyonel içgörü

**Hedef:** Yalnızca doğrulanmış saha verisiyle karar desteği sağlamak; demo/sentetik içeriği gerçek veriden kesin olarak ayırmak.

### P1 — Gerçek veri ve harita

- [ ] Rapor formunda konum, olay türü, açıklama, gözlem zamanı ve kanıt eklerini tutarlı şekilde doğrula.
- [ ] Haritada yalnızca saklanmış koordinatı ve görünürlük yetkisi bulunan kayıtları göster; rapor, istasyon, ölçüm ve alarm katmanlarını filtrelenebilir yap.
- [ ] Harita pininde kaynağı, son güncellemeyi ve doğrulama durumunu göster; renk yanında metin/ikon kullan.
- [ ] Her veri kümesi için kaynak, güncelleme zamanı ve “örnek veri”/“gerçek veri” işaretlemesini sun.

### P2 — Ölçüm, alarm ve raporlama

- [ ] İstasyon/parametre bazında zaman serisi; pH, bulanıklık (NTU), çözünmüş oksijen (mg/L), sıcaklık (°C) gibi değerleri doğru birimleriyle göster.
- [ ] Eşik aşımı uyarılarında kullanılan eşik değerini, eşik kaynağını, ölçüm zamanını ve doğrulama durumunu göster.
- [ ] Bildirim kanallarını kullanıcı tercihi ve olay önemine göre tasarla; e-posta gönderim hatasını görünür ve denetlenebilir kıl.
- [ ] Rapor dışa aktarımını yetki, tarih aralığı, kişisel veri maskeleme ve audit kaydıyla sınırla.
- [ ] Dashboard metriklerini operasyon eylemine bağla: bekleyen kritik raporlar, olay yaşı, ilk yanıt süresi, son ölçüm tazeliği ve eşik aşan istasyonlar.

### P3 — Sonraki ürün kararları

- [ ] Rozet/gamification özelliğini yalnızca rapor kalitesi ve doğrulanmış katkıyı teşvik edecek, yanlış ihbarı ödüllendirmeyecek şekilde ürün araştırmasından sonra değerlendir.
- [ ] Çoklu kurum/konum veya tesis yönetimi gerekirse tenant izolasyonu, rol kapsamı ve veri migrasyonunu ayrı mimari kararı olarak ele al.
- [ ] Su tüketimi/tasarrufu takibi istenirse kalite/ihbar modülüne eklemek yerine ayrı kullanıcı ihtiyacı, ölçüm modeli ve ürün akışı olarak tasarla.

**Faz 3 tamamlanma ölçütü:** Kullanıcı gerçek, örnek ve güncelliğini yitirmiş veriyi ayırt edebilir; grafik ve harita seçimleri doğru filtrelenmiş kayıtlarla tutarlıdır; alarm eşikleri ve rapor dışa aktarımı izlenebilir ve yetkilidir.

## Faz 4 — Test, güvenlik ve canlıya hazırlık

**Hedef:** Tekrarlanabilir kurulum, doğrulanmış kurtarma ve izlenebilir üretim işletimi.

### P0 — Güvenlik ve veri kurtarma

- [ ] Üretim secret'larını secret manager/ortam yapılandırmasında sakla; `.env.local` veya gerçek kullanıcı verisini repoya/artefakta ekleme.
- [ ] Yeni kayıt, login, parola sıfırlama (varsa), yetki değişikliği ve hassas mutasyonlar için rate limit ve audit gereksinimlerini doğrula.
- [ ] SQLite dosyasının yedekleme, saklama, erişim izni ve geri yükleme adımlarını yazıp prova et.
- [ ] Hassas rapor/konum/kişisel veri için erişim, saklama, dışa aktarma ve silme politikasını belirle.
- [ ] Node.js/Next.js/SQLite native eklentisi sürümlerini desteklenen platformlarda temiz kurulumla doğrula; `.next` ve `node_modules` klasörlerini dağıtım artefaktına alma.

### P1 — Kalite kapıları ve gözlemlenebilirlik

- [ ] CI'da `npm ci`, lint, typecheck, smoke, ölçüm testleri ve production build adımlarını çalıştır.
- [ ] Auth, rol matrisi, kayıt, rapor onayı/reddi, harita filtreleri, ölçüm eşikleri ve veri temizliği için regresyon testlerini tamamla.
- [ ] Hata oranı, gecikme, e-posta başarısızlığı, istasyon veri tazeliği ve kritik olayların çözüm süresini izlenebilir kıl.
- [ ] Uygulama health check, yapılandırma doğrulaması ve kullanıcıya veri kaynağı/güncellik bilgisi ekle.
- [ ] Bağımlılık ve lisans taramasını CI'a ekle; bulguları sürüm yükseltme etkisi incelenerek ele al.

### P2 — Sürümleme ve işletim

- [ ] Geliştirme, test ve üretim ortamlarını; secret ve veritabanlarını birbirinden ayır.
- [ ] Sürüm notu, migrasyon adımları, geri dönüş planı ve olay müdahale iletişim sorumlularını tanımla.
- [ ] Kullanıcı kabul testlerini vatandaş, uzman, yönetici ve sistem yöneticisi rolleri için ayrı senaryolarla tamamla.

**Faz 4 tamamlanma ölçütü:** Temiz kurulum ve dağıtım otomatik olarak doğrulanır; kritik yetki ve veri akışları test kapsamındadır; yedekten geri yükleme başarıyla denenmiştir; üretimde hata ve veri güncelliği izlenebilir.

## Önerilen yürütme sırası

1. **P0 güvenlik ve veri bütünlüğü:** API yetkileri, kayıt rolleri, secret yönetimi ve veritabanı yedeği.
2. **P1 test tabanı:** Kritik rol/rapor akışları için test ve CI kalite kapıları.
3. **P1 vatandaş ve operasyon akışları:** Rapor oluşturma, rapor takibi ve role göre iş kuyruğu.
4. **P2 tasarım sistemi/a11y:** Responsive düzen, harita alternatifi, durum bileşenleri ve WCAG kontrolleri.
5. **P2 doğrulanmış içgörüler:** İstasyon ölçümleri, alarm eşikleri, veri tazeliği ve dışa aktarım.
6. **P3 ürün genişlemesi:** Gamification, çoklu kurum veya su tasarrufu kapsamı ancak kullanıcı araştırması ve ayrı veri modeli sonrası.

## Açık kararlar ve varsayımlar

- Bu yol haritası su kirliliği/kalite gözlem ürününü esas alır; su tüketimi takibi dahil değildir.
- Saha sensörleri, kamu veri kaynakları, mevzuat uygunluğu ve gerçek kullanıcı davranışı burada doğrulanmış sayılmaz.
- Herhangi bir rapor “gerçek” olarak etiketlenmeden önce kaynağı, kaynağa erişim yetkisi ve doğrulama durumu belgelenmelidir.
- Çoklu kurum, yüksek erişilebilirlik veya büyük zaman serisi ihtiyacı ortaya çıkarsa yerel SQLite sınırı yeniden değerlendirilmelidir.
