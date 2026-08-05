<h1 align="center">🌊 AquaGuard — Su Kalitesi İzleme ve Erken Uyarı Platformu</h1>

<p align="center">
  <strong>Belediyeler, çevre uzmanları ve vatandaşlar için geliştirilmiş; Gemini destekli AI analizi, çoklu onay mekanizmalı iş kuyrukları ve otomatik bildirimler sunan akıllı su kalitesi yönetim sistemi.</strong>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black">
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white">
  <img alt="Resend" src="https://img.shields.io/badge/Resend-Email-000000?style=flat-square">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square"></a>
</p>

<p align="center">
  <a href="#nasil-calisir"><strong>Nasıl Çalışır</strong></a> ·
  <a href="#mimari">Mimari</a> ·
  <a href="#hizli-baslangic">Hızlı Başlangıç</a> ·
  <a href="#rol-bazli-panolar">Rol Bazlı Panolar</a> ·
  <a href="#kurulum-rehberi">Kurulum Rehberi</a>
</p>

---

## İçindekiler

- [Neden Var?](#neden-var)
- [Özellikler](#ozellikler)
- [Mimari](#mimari)
- [Nasıl Çalışır?](#nasil-calisir)
- [Rol Bazlı Panolar](#rol-bazli-panolar)
- [Hızlı Başlangıç](#hizli-baslangic)
- [Çevresel Değişkenler](#cevresel-degiskenler)

---

## Neden Var?

Su kaynaklarının kirlenmesi, iklim krizi ve endüstriyel atıklar nedeniyle giderek büyüyen bir sorundur. Geleneksel su kalitesi izleme süreçleri genellikle yavaş, kopuk ve kurum içi manuel onay süreçleriyle (kağıt veya basit e-tablolar) yürütülmektedir.

**AquaGuard**, vatandaşların çevre kirliliğini anlık olarak bildirebileceği, sahadan gelen verilerin **yapay zeka (Gemini)** tarafından anında analiz edilip risk skorlarının çıkarıldığı ve **Uzman -> Yönetici** şeklindeki dijital Kanban kuyruklarından geçerek resmi makamlara otomatik e-posta taslakları olarak iletildiği **akıllı ve modern bir otomasyon platformudur**.

---

## Özellikler

| Özellik | Açıklama |
|---|---|
| 🤖 **AI Destekli Analiz** | Saha parametrelerini (pH, Bulanıklık, Oksijen vb.) Gemini AI ile saniyeler içinde yorumlayarak risk seviyesi (Düşük/Orta/Yüksek/Kritik) belirler. |
| 📋 **Kanban İş Akışı** | Raporlar sürükle-bırak destekli görsel panoda (Yeni → AI Analiz → Uzman Onayı → Yönetici Onayı → Yayınlandı) aşama aşama ilerler. |
| 📧 **Otomatik E-posta** | Onaylanan/reddedilen raporlar ve kritik alarmlar için *Resend API* ile gerçek zamanlı, şık HTML şablonlu mailler gönderir. |
| 👥 **Rol Bazlı Erişim** | Vatandaş (Halk), Uzman, Yönetici ve Admin için birbirlerinden tamamen izole edilmiş yetkiler ve ekranlar sunar. |
| 📊 **Kişiselleştirilmiş Pano** | Her rol, giriş yaptığında sadece kendi bekleyen iş yükünü ve ilgili istatistiklerini gördüğü özel bir Dashboard'a yönlendirilir. |
| 💬 **AquaBot (AI Chat)** | Kullanıcıların su parametreleri, en riskli bölgeler ve genel durum hakkında doğal dille sorular sorabileceği entegre chatbot. |
| 🌓 **Modern Arayüz** | Glassmorphism, karanlık mod (dark mode) ve yumuşak animasyonlarla zenginleştirilmiş premium kullanıcı deneyimi. |

---

## Mimari

Proje, güncel **Next.js 15 (App Router)** ve React 19 mimarisi üzerinde inşa edilmiştir. State yönetimi ve veri katmanı hafif tutulmuş, auth ve veritabanı şimdilik in-memory (RAM) çözümlerle mocklanmıştır.

- **Frontend:** React, Next.js (Server/Client Components), Vanilla CSS Modules
- **Backend:** Next.js Route Handlers (`/api/...`)
- **Yapay Zeka:** Google Generative AI (`gemini-flash-latest`)
- **E-posta İletimi:** Resend Node SDK
- **Güvenlik:** JWT tabanlı, HTTP-Only Cookie oturum yönetimi

---

## Nasıl Çalışır?

1. **Rapor Oluşturma:** Vatandaş veya saha görevlisi, yeni bir su numunesi sonucunu veya çevre şikayetini sisteme girer.
2. **AI Ön Değerlendirme:** Gemini AI, girilen parametreleri analiz eder, anomali tespit eder ve rapora bir **Risk Skoru (0-100)** atayarak özet çıkartır.
3. **Uzman İncelemesi (1. Onay):** Sistemdeki Çevre Uzmanı, kendi kuyruğuna düşen bu raporu inceler. Bilimsel olarak tutarlıysa onaylar, değilse gerekçesiyle reddeder.
4. **Yönetici Onayı (2. Onay):** Uzmandan geçen rapor, bölge yöneticisinin ekranına düşer. Yönetici nihai onayını verir.
5. **Otomatik Aksiyon:** Yönetici onayladığı an, sistem ilgili kurumlara resmi bir dilekçe formatında uyarı maili gönderir.

---

## Rol Bazlı Panolar

Kullanıcılar "Profilim" sayfasına gittiklerinde kendi yetkilerine göre şekillenmiş panolar görürler:

- **🌍 Vatandaş (Halk):** Sadece kendi gönderdiği raporların durumu, çevre rozetleri ve yerel uyarılar.
- **🧑‍🔬 Uzman:** Uzman onayı bekleyen raporların ortak havuzu, hızlı AI analiz aracı, inceleme bekleme süreleri.
- **👔 Yönetici:** Uzmandan geçmiş ve nihai onay/red işlemi bekleyen kritik iş yükü, takımın ortalama rapor onaylama hızı.
- **👑 Admin:** Tüm sistemin (API, Email, Aktif Kullanıcı) genel sağlığı ve tüm raporların panosu.

---

## Hızlı Başlangıç

### Gereksinimler
- Node.js >= 18.x
- NPM veya Yarn
- Google Gemini API Anahtarı
- Resend API Anahtarı (Gerçek mail gönderimi için)

### Kurulum

1. Repoyu klonlayın:
```bash
git clone https://github.com/meryemgcl/aquaguard-app.git
cd aquaguard-v3
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

Sunucu `http://localhost:3000` adresinde çalışacaktır.

---

## Çevresel Değişkenler (`.env`)

Kök dizinde `.env` dosyası oluşturun ve aşağıdaki yapılandırmayı ekleyin:

```env
# Zorunlu
JWT_SECRET=super-secret-jwt-key
GEMINI_API_KEY=sizin-google-ai-anahtariniz

# İsteğe Bağlı (Mail Gönderimi İçin)
RESEND_API_KEY=re_sizin_resend_anahtariniz
RESEND_TO_OVERRIDE=test@kendi-mailiniz.com # Test maillerinin tümünü tek bir adrese yönlendirmek için

# Demo Hesaplar için Gerçek E-postalar (Opsiyonel)
ADMIN_EMAIL=admin@sirket.com
UZMAN_EMAIL=uzman@sirket.com
YONETICI_EMAIL=yonetici@sirket.com
```

> Daha detaylı e-posta kurulumu için [EMAIL_SETUP.md](./EMAIL_SETUP.md) dosyasına göz atabilirsiniz.
