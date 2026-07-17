<<<<<<< HEAD
# aquaguard-app
=======
# AquaGuard

Basit bir Next.js demo uygulaması — kanban + e-posta şablonları ve basit JWT auth.

**Hızlı Başlangıç**

- Gereksinimler: `Node.js >= 18`, `npm`

- Projeyi klonlayın ve bağımlılıkları yükleyin:

```bash
git clone <your-repo-url>
cd aquaguard
npm install
```

- Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

- Tarayıcıda açın: `http://localhost:3000`

**Demo giriş bilgileri (seeded users)**

- Admin: `admin@aquaguard.com` / `123456`
- Uzman: `ayse@aquaguard.com` / `123456`
- Yönetici: `mehmet@aquaguard.com` / `123456`
- Halk: `halk@aquaguard.com` / `123456`

**Üretim**

## aquaguard-app

# AquaGuard

Basit bir Next.js demo uygulaması — kanban + e-posta şablonları ve basit JWT auth.

**Hızlı Başlangıç**

- Gereksinimler: `Node.js >= 18`, `npm`

- Projeyi klonlayın ve bağımlılıkları yükleyin:

```bash
git clone <your-repo-url>
cd aquaguard
npm install
```

- Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

- Tarayıcıda açın: `http://localhost:3000`

**Demo giriş bilgileri (seeded users)**

- Admin: `admin@aquaguard.com` / `123456`
- Uzman: `ayse@aquaguard.com` / `123456`
- Yönetici: `mehmet@aquaguard.com` / `123456`
- Halk: `halk@aquaguard.com` / `123456`

**Üretim**

```bash
npm run build
npm start
```

**Ortam değişkenleri**

- `JWT_SECRET` — (opsiyonel) JWT için gizli anahtar. Varsayılan bir değer uygulanır fakat prod için değiştirin.
- `RESEND_API_KEY` — E-posta gönderimi için Resend API anahtarı. `mock` veya boş bırakılırsa e-postalar konsola yazdırılır.
- `NEXT_PUBLIC_APP_URL` — Uygulama URL'si (örn. `https://example.com`) — e-posta içindeki linkler için.

**Notlar**

- E-posta gönderimleri varsayılan olarak mock (konsola) çalışır; gerçek gönderim isterseniz `RESEND_API_KEY` ayarlayın ve `resend` paketini yükleyin.
- Kullanıcılar hafızada (in-memory) seedleniyor; uygulama yeniden başlatıldığında seed tekrar uygulanır.

**GitHub'a gönderme (örnek)**

```bash
git init
git add .
git commit -m "Initial commit"
# GitHub'da yeni repo oluşturun ve aşağıdaki remote'u ekleyin
git remote add origin git@github.com:USERNAME/REPO.git
git branch -M main
git push -u origin main
```

**Yardım**

Herhangi bir adımda hata alırsanız terminal çıktısını paylaşın, birlikte çözelim.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
