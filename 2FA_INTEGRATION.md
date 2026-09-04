# 🔐 İki Faktörlü Doğrulama (2FA) Sistem Entegrasyonu

## Genel Bakış

AquaGuard uygulamasına **TOTP (Time-based One-Time Password)** bazlı iki faktörlü doğrulama sistemi eklendi. Bu sistem geliştirilmiş güvenlik sağlar.

## 📋 Değişiklikler

### 1. **Yeni Paketler Kuruldu**
```bash
npm install speakeasy qrcode
npm install --save-dev @types/speakeasy @types/qrcode
```

### 2. **Güncellenen Dosyalar**

#### `lib/types.ts`
User, SafeUser ve JWTPayload arayüzlerine 2FA alanları eklendi:
- `twoFactorEnabled`: 2FA aktif mi?
- `twoFactorSecret`: TOTP secret (şifreli)
- `backupCodes`: Yedek kodlar
- `twoFactorVerified`: JWT token'da 2FA doğrulandı mı?
- `twoFactorChallenge`: Geçici token için challenge alanı

#### `lib/auth.ts`
Yeni 2FA fonksiyonları:
```typescript
generateTwoFactorSecret(email)         // TOTP secret + QR code
generateQRCodeDataUrl(otpauthUrl)      // QR kodu data URL'si olarak döndür
verifyTwoFactorToken(secret, token)    // TOTP kodunu doğrula
generateBackupCodes(count)             // Yedek kodlar oluştur
hashBackupCodes(codes)                 // Yedek kodları hash'le
verifyBackupCode(code, hashedCodes)    // Yedek kodu doğrula
```

#### `app/api/auth/login/route.ts`
2FA kontrol eklendi:
- 2FA aktifse, geçici token (5 dakika) döndürülür
- 2FA aktif değilse, normal akış devam eder

#### `lib/users.ts`
`updateUser()` fonksiyonu geliştirildi:
- 2FA secret ve backup codes güvenli şekilde kaydedilir

### 3. **Yeni API Endpoint'leri**

#### **POST `/api/auth/2fa/setup`** 
2FA kurulumunu başlatır
```typescript
// İstek: Kimlik doğrulanmış kullanıcı (token gerekli)

// Yanıt:
{
  "success": true,
  "secret": "JBSWY3DPEBLW64TMMQ......",
  "qrCodeDataUrl": "data:image/png;base64,iVBORw0K...",
  "message": "Please scan the QR code..."
}
```

#### **POST `/api/auth/2fa/verify`**
2FA'yı doğrulama kodu ile etkinleştirir
```typescript
// İstek:
{
  "secret": "JBSWY3DPEBLW64TMMQ......",
  "code": "123456"  // Authenticator uygulamasından
}

// Yanıt:
{
  "success": true,
  "message": "2FA enabled successfully",
  "backupCodes": ["ABC12345", "XYZ98765", ...] // Sadece bir kez gösterilir!
}
```

#### **POST `/api/auth/2fa/challenge`**
Login sırasında 2FA kodu doğrular
```typescript
// İstek (tempToken ile):
{
  "code": "123456"  // TOTP veya yedek kod
}

// Yanıt:
{
  "success": true,
  "message": "2FA verification successful!",
  "token": "eyJhbGc...",  // Final session token
  "user": { ... }
}
```

## 🔄 Login Akışı (2FA ile)

### Adım 1: Şifre ile Login
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

Yanıt (2FA aktifse):
{
  "success": true,
  "requiresTwoFactor": true,
  "tempToken": "eyJhbGc..."  // 5 dakika geçerli
}
```

### Adım 2: 2FA Kodu Gönder
```
POST /api/auth/2fa/challenge
(Cookie: tempToken)
{
  "code": "123456"  // Authenticator uygulamasından
}

Yanıt:
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { ... }
}
```

### Adım 3: Session Kurulu
Final token ile session başlatılır.

---

## 2️⃣ Frontend Entegrasyonu (Örnek)

### 1. Login Sayfası
```typescript
const handleLogin = async (email: string, password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  const data = await res.json();
  
  if (data.requiresTwoFactor) {
    // 2FA modal'ı göster
    show2FAModal(data.tempToken);
  } else {
    // Normal login
    localStorage.setItem('token', data.token);
  }
};
```

### 2. 2FA Modal
```typescript
const handle2FA = async (code: string, tempToken: string) => {
  const res = await fetch('/api/auth/2fa/challenge', {
    method: 'POST',
    body: JSON.stringify({ code }),
    headers: {
      'Cookie': `token=${tempToken}`
    }
  });
  
  const data = await res.json();
  
  if (data.success) {
    localStorage.setItem('token', data.token);
    // Redirect dashboard'a
  }
};
```

### 3. Ayarlar Sayfası (2FA Kurulumu)
```typescript
const setup2FA = async () => {
  // Step 1: Setup endpoint'ini çağır
  const setupRes = await fetch('/api/auth/2fa/setup', {
    method: 'POST'
  });
  
  const { secret, qrCodeDataUrl } = await setupRes.json();
  
  // QR kodu göster
  displayQRCode(qrCodeDataUrl);
  
  // Step 2: Kullanıcı kodu doğrulasın
  const verifyRes = await fetch('/api/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ secret, code: userEnteredCode })
  });
  
  const { backupCodes } = await verifyRes.json();
  
  // Yedek kodları göster (Print/Download önerilir)
  displayBackupCodes(backupCodes);
};
```

---

## 🛡️ Güvenlik Özellikleri

1. **TOTP Standard**: RFC 6238 uyumlu
2. **Yedek Kodlar**: Telefon kaybı durumunda erişim (10 kod, 1 kez kullanım)
3. **Geçici Token**: 2FA challenge için 5 dakika geçerli
4. **Bcrypt Hash**: TOTP secret ve backup codes Firestore'da hash'lenerek kaydedilir
5. **Rate Limiting**: Login denemelerine mevcut rate limiting uygulanır

---

## 📱 Desteklenen Authenticator Uygulamaları

- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- LastPass
- Bitwarden

---

## ⚠️ Dikkat Edilecek Noktalar

1. **Yedek Kodları Kaydet**: 2FA kurulum sırasında verilen 10 backup kod mutlaka kaydedilmeli
2. **QR Kodu Scan Başarısı**: Verificaton code'u sadece QR taraması başarılı olduktan sonra doğrula
3. **Saat Senkronizasyonu**: TOTP kullanıcı cihazı ile sunucunun saatinin senkronize olmasını gerektirir
4. **Şifre Yönetimi**: 2FA etkin kullanıcılar için şifre sıfırlama flow'u güvenli olmalı

---

## 🔧 Deployment Notları

- `NEXT_PUBLIC_*` ile başlayan yeni env variables yok
- Mevcut `JWT_SECRET` kullanılıyor
- Firestore schema uyumlu (backward compatible)
- Production ortamında `TOTP_WINDOW=2` (±2 time window)

---

## 📝 Sonraki Adımlar

1. Frontend 2FA modal'ı ve ayarlar sayfası tasarımı
2. Backup code managament UI
3. 2FA disabling/reset flow
4. Admin panel'de 2FA zorlama seçeneği
5. Email verification ile 2FA combine etme
