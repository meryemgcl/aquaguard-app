# 📧 AquaGuard — Gerçek E-posta Kurulum Kılavuzu

## 1. E-posta Adreslerinizi `.env` Dosyasına Girin

`aquaguard-v3/.env` dosyasını açın ve şu satırları **kendi gerçek adreslerinizle** doldurun:

```env
# Her rol için farklı gerçek e-posta
ADMIN_EMAIL=sizin@gercekadresiniz.com
ADMIN_NAME=Adınız Soyadınız

UZMAN_EMAIL=uzman@sirketiniz.com
UZMAN_NAME=Uzman Kişi Adı

YONETICI_EMAIL=yonetici@sirketiniz.com
YONETICI_NAME=Yönetici Adı

HALK_EMAIL=vatandas@example.com
HALK_NAME=Vatandaş Adı
```

**Giriş bilgileri:**
- E-posta: yukarıdaki adresler
- Şifre: `123456` (hepsi için)

---

## 2. Resend API Key Alın (Ücretsiz)

1. **https://resend.com** adresine gidin
2. "Get Started" → Google/GitHub ile kayıt olun
3. Sol menüde **API Keys** → **Create API Key**
4. Oluşturulan key'i kopyalayın
5. `.env` dosyasına yapıştırın:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   ```

---

## 3. Resend Ücretsiz Plan Kısıtlaması

> ⚠️ Resend ücretsiz planda **sadece kendi doğrulanmış e-postanıza** gönderebilirsiniz.

### Çözüm A — Test için: Tek adrese yönlendir

Tüm mailleri kendi adresinize yönlendirmek için:
```env
RESEND_TO_OVERRIDE=sizin@email.com
```
Bu satır doldurulunca **tüm roller** bu adrese mail alır.

### Çözüm B — Domain doğrulama (Üretim için)

Kendi domain'iniz varsa (örn: `sirketiniz.com`):
1. Resend → **Domains** → **Add Domain**
2. DNS kayıtlarını ekleyin (5 dakika)
3. `MAIL_FROM=AquaGuard <noreply@sirketiniz.com>` yapın
4. Artık sınırsız adrese mail gönderebilirsiniz ✅

---

## 4. Ne Zaman Mail Gönderilir?

| Olay | Alıcı | Tür |
|------|-------|-----|
| 🎉 Yeni kayıt | Kaydolan kullanıcı | Hoşgeldin |
| 🔬 Uzman onayı | Admin + Yönetici | Bildirim |
| ✅ Yönetici onayı | Admin + Rapor sahibi | Yayın bildirimi |
| ❌ Red | Rapor sahibi + Admin | Red gerekçesi |
| 🚨 Kritik alarm | Admin | Acil uyarı |

---

## 5. Sunucuyu Yeniden Başlatın

`.env` değişikliğinden sonra mutlaka sunucuyu yeniden başlatın:

```bash
# Terminalde aquaguard-v3 klasöründe:
npm run dev
```

---

## Sorun Giderme

**Mail gitmiyor?**
- `RESEND_API_KEY` doğru mu?
- `RESEND_TO_OVERRIDE` dolu mu? (test için kendi adresinizi yazın)
- Sunucu loglarında `[MAIL SIMULATED]` görüyorsanız API key eksik

**Giriş yapamıyorum?**
- `.env` değiştirdikten sonra sunucuyu yeniden başlatın
- E-posta: `.env`'deki adres, Şifre: `123456`
