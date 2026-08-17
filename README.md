# AquaGuard v3 - Gerçek Zamanlı Su Kalitesi İzleme Sistemi

AquaGuard, Türkiye genelindeki su kaynaklarının kalitesini izlemek, raporlamak ve yapay zeka (Gemini) ile analiz etmek için geliştirilmiş modern, şık ve **gerçek zamanlı (real-time)** bir web uygulamasıdır.

## 🌟 Yenilikler (v3 Sürümü)

v3 sürümü ile birlikte AquaGuard, Firebase altyapısına geçiş yapmış ve tamamen **gerçek zamanlı** bir mimariye kavuşmuştur:

- **Gerçek Zamanlı Kanban Panosu:** Raporlar yetkililer arasında sürükle-bırak yöntemiyle taşınırken veritabanı anında güncellenir. Bir yetkili kartı taşıdığında, sisteme bağlı olan diğer tüm kullanıcıların ekranı sayfayı yenilemeye gerek kalmadan saniyeler içinde senkronize olur.
- **Canlı Harita Entegrasyonu:** Pano (Dashboard) ve interaktif harita sayfası doğrudan Firestore veritabanına bağlanmıştır. "Yeni Rapor Ekle" butonuyla halk veya uzmanlar tarafından eklenen raporlar, haritada anında yeni bir nokta (marker) olarak belirir.
- **Firebase Firestore Altyapısı:** Önceki sürümlerdeki LocalStorage (tarayıcı önbelleği) sınırlandırmaları kaldırılarak güvenli ve ölçeklenebilir bulut veritabanı altyapısına geçilmiştir.
- **UI/UX İyileştirmeleri:** Leaflet harita render hataları giderilmiş, modern renk paletleri ve responsive tasarımlar iyileştirilmiştir.

## 🛠️ Teknolojiler

- **Frontend:** Next.js 14 (App Router), React, CSS Modules
- **Veritabanı:** Firebase Firestore (Real-time SDK)
- **Harita:** Leaflet & React-Leaflet
- **Yapay Zeka:** Google Gemini Pro (AI Analiz ve çözüm önerileri)
- **Sürükle & Bırak:** @dnd-kit/core (Kanban için)
- **Grafikler:** Recharts

## 🚀 Kurulum

Projeyi yerel ortamınızda çalıştırmak için:

1. Repoyu bilgisayarınıza klonlayın.
2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
3. Proje ana dizininde bir `.env.local` dosyası oluşturun ve aşağıdaki Firebase yapılandırmanızı ekleyin:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY="api_key"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="proje_id.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="proje_id"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="proje_id.firebasestorage.app"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="sender_id"
   NEXT_PUBLIC_FIREBASE_APP_ID="app_id"
   ```
4. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
5. Tarayıcınızda `http://localhost:3000` adresine gidin.

## 📋 İş Akışı (Rapor Yönetimi)

1. **Yeni Rapor (Halk/Uzman):** Sisteme konum ve risk düzeyi belirtilerek girilir. Haritada anında belirir.
2. **AI Analiz:** Gemini yapay zekası rapor verilerini analiz edip çözüm önerisi sunar.
3. **1. Onay (Uzman):** Uzmanlar raporu inceler ve onaylar. (Bildirim maili gider)
4. **2. Onay (Yönetici):** Yöneticiler son incelemeyi yapar ve yayınlar. (Nihai bildirim maili gider)
5. **Yayınlandı:** Temiz veya onaylı raporlar halka açık haritada resmi olarak yerini alır.

---
*Geliştirici:* [Meryem Güçlü]
