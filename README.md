<div align="center">

# 🌊 AquaGuard

### Akıllı Su Kalitesi İzleme Platformu

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.0_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-00ff88?style=for-the-badge)](LICENSE)

*Su kaynaklarını korumak için yapay zeka destekli gerçek zamanlı izleme, analiz ve raporlama.*

---

</div>

## 📖 Proje Hakkında

**AquaGuard**, Türkiye genelindeki su kaynaklarının kalitesini gerçek zamanlı izleyen, yapay zeka ile analiz eden ve çok katmanlı bir onay mekanizması ile raporlayan modern bir web platformudur.

### 🎯 Hangi Sorunları Çözüyor?

- **Geleneksel su kalitesi takibi** yavaş ve manuel süreçlere dayanır → AquaGuard ile **anlık izleme**
- **Anomaliler geç fark edilir** → AI destekli **otomatik anomali tespiti** ve erken uyarı
- **Raporlama süreci karmaşık** → Kanban tabanlı **sürükle-bırak iş akışı** ile kolaylaştırılmış süreç
- **Paydaş koordinasyonu zor** → **Çift onay mekanizması** + otomatik mail bildirimleri

---

## 🛠️ Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Tasarım** | CSS Modules, Glassmorphism, Dark Theme |
| **Harita** | Leaflet + React-Leaflet (CartoDB Dark Tiles) |
| **Grafikler** | Recharts (Area, Bar, Pie) |
| **Yapay Zeka** | Google Gemini 2.0 Flash API |
| **Mail Servisi** | Resend API (mock fallback destekli) |
| **Kimlik Doğrulama** | JWT (jose), bcryptjs, HttpOnly Cookie |
| **Font** | Inter (Google Fonts via next/font) |

---

## ✨ Özellikler

### 📊 İnteraktif Dashboard
- 4 istatistik kartı (Toplam Rapor, Bekleyen Onay, Ort. Risk, Yayınlanan)
- Aylık risk trendi (alan grafik), bölge bazlı raporlar (bar grafik), durum dağılımı (pasta grafik)
- Son aktivite akışı

### 🗺️ Canlı Harita
- Türkiye genelinde **10 izleme noktası** (gerçek koordinatlar)
- Risk skoruna göre renkli pinler (🟢 Düşük / 🟡 Orta / 🟠 Yüksek / 🔴 Kritik)
- Tıklanabilir popup: pH, bulanıklık, çözünmüş oksijen, sıcaklık
- Risk seviyesi filtreleme + tam ekran harita modu

### 🤖 AI Analiz (Gemini)
- **Anomali Tespiti**: 6 parametre × 2 seviye (uyarı/kritik)
- **Risk Skorlama**: 0-100 ağırlıklı skor hesabı
- **Otomatik Rapor Özeti**: Türkçe değerlendirme + öneriler
- **AquaBot Chatbot**: Doğal dil ile su kalitesi sorgulama

### 📋 Kanban Board
- 6 kolonlu sürükle-bırak iş akışı
- Çift onay mekanizması (Uzman → Yönetici)
- Onay/red geçmişi (timeline)
- Zorunlu red sebebi

### 📧 Mail Otomasyon
- 6 otomatik tetikleyici (yeni rapor, AI analiz, onay, red, yayın)
- AquaGuard markalı HTML şablonlar
- Admin panelinde canlı şablon editörü + önizleme
- Mail log tablosu ve istatistikler

### 🔐 Kimlik Doğrulama
- 4 kullanıcı rolü: Admin, Uzman, Yönetici, Halk
- JWT tabanlı oturum yönetimi
- Rol bazlı erişim kontrolü
- Glassmorphism login/register sayfaları

---

## 🚀 Kurulum

### Gereksinimler

- [Node.js](https://nodejs.org/) v18 veya üzeri
- npm veya yarn

### Adımlar

```bash
# 1. Projeyi klonlayın
git clone https://github.com/meryemgcl/aquaguard-app.git
cd aquaguard-app

# 2. Bağımlılıkları kurun
npm install

# 3. Ortam değişkenlerini ayarlayın
cp .env.example .env.local
# .env.local dosyasını düzenleyin (aşağıya bakın)

# 4. Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

### Ortam Değişkenleri (`.env.local`)

```env
# JWT Secret (production'da değiştirin!)
JWT_SECRET=your-secret-key-here

# Resend API - 'mock' yazarsanız e-postalar konsola yazdırılır
RESEND_API_KEY=mock

# Gemini API - 'mock' yazarsanız yerel fallback yanıtlar kullanılır
# Gerçek key: https://aistudio.google.com/apikey
GEMINI_API_KEY=mock

# Uygulama URL'si
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Demo Hesaplar

| Rol | E-posta | Şifre |
|-----|---------|-------|
| 🔵 Admin | `admin@aquaguard.com` | `123456` |
| 🟣 Uzman | `ayse@aquaguard.com` | `123456` |
| 🟢 Yönetici | `mehmet@aquaguard.com` | `123456` |
| ⚪ Halk | `halk@aquaguard.com` | `123456` |

---

## 📁 Proje Yapısı

```
aquaguard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── ai/             # AI analiz + chatbot
│   │   │   ├── auth/           # Login, register, me
│   │   │   ├── dashboard/      # Dashboard verileri
│   │   │   ├── kanban/         # Kanban CRUD + onay/red
│   │   │   └── mail/           # Şablon + log yönetimi
│   │   ├── ai-analiz/          # AI Analiz sayfası
│   │   ├── harita/             # Tam ekran harita
│   │   ├── kanban/             # Kanban board
│   │   ├── login/              # Giriş sayfası
│   │   ├── register/           # Kayıt sayfası
│   │   └── mail-sablonlari/    # Mail admin paneli
│   ├── components/             # React bileşenleri
│   │   ├── AiAnalysis/         # AI analiz paneli + chatbot
│   │   ├── Dashboard/          # Stat kartları + harita + grafikler
│   │   ├── Kanban/             # Sürükle-bırak board
│   │   ├── MailTemplates/      # Şablon editörü
│   │   ├── MapPage/            # Tam ekran harita
│   │   └── ...                 # Sidebar, Navbar, AuthProvider
│   └── lib/                    # İş mantığı
│       ├── ai.ts               # Gemini entegrasyonu
│       ├── dashboard.ts        # Dashboard verileri
│       ├── email.ts            # E-posta motoru
│       ├── kanban.ts           # Kanban veri deposu
│       ├── mailTemplates.ts    # HTML şablonlar
│       └── types.ts            # TypeScript tipleri
├── .env.local                  # Ortam değişkenleri
└── package.json
```

---

## 🗺️ Yol Haritası (Roadmap)

- [ ] 🌐 Gerçek zamanlı IoT sensör entegrasyonu
- [ ] 📱 Progressive Web App (PWA) desteği
- [ ] 🗄️ PostgreSQL / Supabase veritabanı entegrasyonu
- [ ] 📊 Zaman serisi grafikleri ve trend karşılaştırma
- [ ] 🔔 WebSocket ile anlık bildirimler
- [ ] 🌍 Çok dil desteği (EN/TR)
- [ ] 📄 PDF rapor dışa aktarma
- [ ] 🧪 Kapsamlı unit ve e2e test coverage

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır. Özgürce kullanabilir, değiştirebilir ve dağıtabilirsiniz.

---

## 📬 İletişim

**Meryem Güçlü**

- 🔗 GitHub: [@meryemgcl](https://github.com/meryemgcl)

---

<div align="center">

🌊 *Su hayattır. AquaGuard ile koruyalım.* 💧

</div>
