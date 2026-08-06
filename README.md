<h1 align="center">🌊 AquaGuard — Su Kalitesi İzleme ve Erken Uyarı Platformu</h1>

<p align="center">
  <strong>Belediyeler, çevre uzmanları ve vatandaşlar için geliştirilmiş; Gemini destekli AI analizi, çoklu onay mekanizmalı iş kuyrukları ve otomatik bildirimler sunan akıllı su kalitesi yönetim sistemi.</strong>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black">
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white">
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white">
</p>

<p align="center">
  <a href="https://aquaguard-app-txd7.vercel.app/"><strong>🚀 Canlı Demo İçin Tıklayın</strong></a>
</p>

<p align="center">
  <a href="#nasil-calisir"><strong>Nasıl Çalışır</strong></a> ·
  <a href="#mimari">Mimari</a> ·
  <a href="#hizli-baslangic">Hızlı Başlangıç</a> ·
  <a href="#ozellikler">Özellikler</a>
</p>

---

## İçindekiler

- [Neden Var?](#neden-var)
- [Özellikler](#ozellikler)
- [Mimari](#mimari)
- [Nasıl Çalışır?](#nasil-calisir)
- [Rol Bazlı Panolar](#rol-bazli-panolar)
- [Hızlı Başlangıç](#hizli-baslangic)

---

## Neden Var?

Su kaynaklarının kirlenmesi, iklim krizi ve endüstriyel atıklar nedeniyle giderek büyüyen bir sorundur. Geleneksel su kalitesi izleme süreçleri genellikle yavaş, kopuk ve kurum içi manuel onay süreçleriyle (kağıt veya basit e-tablolar) yürütülmektedir.

**AquaGuard**, vatandaşların çevre kirliliğini anlık olarak bildirebileceği, sahadan gelen verilerin **yapay zeka (Gemini)** tarafından anında analiz edilip risk skorlarının çıkarıldığı ve **Uzman -> Yönetici** şeklindeki dijital Kanban kuyruklarından geçerek resmi makamlara otomatik e-posta taslakları olarak iletildiği **akıllı ve modern bir otomasyon platformudur**.

---

## Özellikler

| Özellik | Açıklama |
|---|---|
| 🤖 **AI Destekli Analiz** | Saha parametrelerini (pH, Bulanıklık, Oksijen vb.) Gemini AI ile saniyeler içinde yorumlayarak risk seviyesi (Düşük/Orta/Yüksek/Kritik) belirler. |
| 📋 **Kanban İş Akışı** | Raporlar sürükle-bırak destekli görsel panoda aşama aşama ilerler (Yeni → AI Analiz → Uzman Onayı → Yönetici Onayı → Yayınlandı). |
| 🗺️ **Canlı / 3D Uydu Haritası** | Raporlanan verileri interaktif Türkiye haritası üzerinde gösterir. Koyu, Açık ve Canlı Uydu (Satellite) görünümleri sunar. |
| 📄 **PDF Rapor Çıktısı** | Arşiv veya Kanban üzerinden onaylanmış raporlar ve ölçümler için tek tıkla cihazınıza uygun şık formatta PDF çıktısı almanızı sağlar. |
| 🎓 **Eğitici Bilgi Kartları** | Oksijen, pH ve Bulanıklık gibi değerlerin yanına halk dilinde, "Beklenen aralık nedir? Aşıldığında ne olur?" gibi anlaşılır yönlendirmeler ekler. |
| 🌓 **Dinamik Tema (Dark/Light)** | Göz yormayan, sistemin bütününe entegre olan ve tercihlerinizi kaydeden Açık ve Koyu tema seçenekleri (Glassmorphism tasarımı ile). |
| 👥 **Rol Bazlı Erişim** | Vatandaş (Halk), Uzman, Yönetici ve Admin için birbirlerinden tamamen izole edilmiş yetkiler ve dashboard ekranları sunar. |
| 📧 **Otomatik E-posta** | Onaylanan/reddedilen raporlar ve kritik alarmlar için *Resend API* ile gerçek zamanlı, HTML şablonlu mailler gönderir. |

---

## Mimari

Proje, güncel **Next.js 15 (App Router)** ve React 19 mimarisi üzerinde inşa edilmiştir. 

- **Frontend:** React, Next.js, Vanilla CSS Modules (Glassmorphism)
- **Backend:** Next.js Route Handlers (`/api/...`)
- **Yapay Zeka:** Google Generative AI (`gemini-flash-latest`)
- **Harita:** React-Leaflet
- **Güvenlik:** JWT tabanlı, HTTP-Only Cookie oturum yönetimi
- **Deployment:** Vercel (CI/CD Entegreli)

---

## Nasıl Çalışır?

1. **Rapor Oluşturma:** Vatandaş veya saha görevlisi, yeni bir su numunesi sonucunu veya çevre şikayetini sisteme girer.
2. **AI Ön Değerlendirme:** Gemini AI, girilen parametreleri analiz eder ve rapora bir **Risk Skoru (0-100)** atar.
3. **Uzman İncelemesi:** Çevre Uzmanı raporu inceler. Bilimsel olarak tutarlıysa onaylar, değilse gerekçesiyle reddeder.
4. **Yönetici Onayı:** Uzmandan geçen rapor, bölge yöneticisinin ekranına düşer ve nihai onayı alır.
5. **PDF Arşiv ve Otomatik Aksiyon:** Onaylanan rapor, tüm kullanıcıların inceleyip PDF olarak indirebileceği Arşive aktarılır ve ilgili makamlara bilgilendirme maili atılır.

---

## Rol Bazlı Panolar

Kullanıcılar "Profilim" sayfasına gittiklerinde kendi yetkilerine göre şekillenmiş panolar görürler:

- **🌍 Vatandaş (Halk):** Sadece kendi gönderdiği raporların durumu, çevre rozetleri ve yerel uyarılar.
- **🧑‍🔬 Uzman:** Uzman onayı bekleyen raporların ortak havuzu, hızlı AI analiz aracı.
- **👔 Yönetici:** Uzmandan geçmiş ve nihai onay/red işlemi bekleyen kritik iş yükü.
- **👑 Admin:** Tüm sistemin genel sağlığı ve istatistikleri.

---

## Hızlı Başlangıç

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

3. Kök dizinde `.env` dosyası oluşturun:
```env
JWT_SECRET=super-secret-jwt-key
GEMINI_API_KEY=sizin-google-ai-anahtariniz
RESEND_API_KEY=opsiyonel-resend-key
```

4. Sunucuyu başlatın (`http://localhost:3000`):
```bash
npm run dev
```
