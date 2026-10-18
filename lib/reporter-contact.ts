import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export interface ReporterContact {
  name: string;
  contact: string;
}

function encryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Gizli ihbar iletişim bilgilerini korumak için en az 32 karakterlik JWT_SECRET gereklidir.');
  }
  return createHash('sha256').update(`aquaguard-reporter-contact:v1:${secret}`).digest();
}

export function encryptReporterContact(contact: ReporterContact): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(contact), 'utf8'),
    cipher.final(),
  ]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptReporterContact(encrypted: string): ReporterContact {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = encrypted.split('.');
  if (version !== 'v1' || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error('İhbarcı iletişim bilgisi şifreli biçimde geçersiz.');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  const parsed: unknown = JSON.parse(plaintext);
  if (!parsed || typeof parsed !== 'object' || !('name' in parsed) ||
      typeof parsed.name !== 'string' || !('contact' in parsed) ||
      typeof parsed.contact !== 'string') {
    throw new Error('Şifreli ihbarcı iletişim verisinin içeriği geçersiz.');
  }
  return { name: parsed.name, contact: parsed.contact };
}
