import { User, SafeUser, UserRole } from './types';
import { hashPassword } from './auth';
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, deleteDoc, updateDoc } from 'firebase/firestore';

// Süper Admin için özel bir sentinel hash sabiti kullanıyoruz.
// Login sırasında bu hash görülürse, bcrypt yerine düz string karşılaştırması yapılır.
export const SUPER_ADMIN_SENTINEL = '__SUPER_ADMIN_PLAIN__';

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log('[DEBUG FIND USER]', { normalizedEmail, superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim() });
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();

  // Süper Admin: ENV'deki email eşleşiyorsa, şifreyi sentinel ile döndür
  if (superAdminEmail && normalizedEmail === superAdminEmail) {
    return {
      id: 'super-admin-env',
      name: 'Super Admin',
      email: normalizedEmail,
      passwordHash: SUPER_ADMIN_SENTINEL, // bcrypt hash değil, özel işaret
      role: 'super_admin',
      createdAt: new Date().toISOString(),
    };
  }

  // Normal kullanıcılar: Firestore'dan bul
  const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return undefined;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as User;
}

export async function findUserById(id: string): Promise<User | undefined> {
  if (id === 'super-admin-env') {
    return {
      id: 'super-admin-env',
      name: 'Super Admin',
      email: process.env.SUPER_ADMIN_EMAIL || '',
      passwordHash: '',
      role: 'super_admin',
      createdAt: new Date().toISOString(),
    };
  }

  const docRef = doc(db, 'users', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return undefined;
  return { id: docSnap.id, ...docSnap.data() } as User;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  requestedRole?: Extract<UserRole, 'uzman' | 'yonetici'>;
}): Promise<SafeUser> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const trimmedName = data.name.trim();

  if (!trimmedName || !normalizedEmail || data.password.length < 6) {
    throw new Error('Geçersiz kullanıcı bilgisi.');
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) throw new Error('Bu e-posta adresi zaten kayıtlı.');

  const passwordHash = await hashPassword(data.password);
  const newUser: User = {
    id: String(Date.now()),
    name: trimmedName,
    email: normalizedEmail,
    passwordHash,
    role: 'halk',
    accountStatus: data.requestedRole ? 'pending' : 'active',
    requestedRole: data.requestedRole,
    createdAt: new Date().toISOString(),
  };

  const docRef = doc(db, 'users', newUser.id);
  await setDoc(docRef, newUser);

  return toSafeUser(newUser);
}

export async function getAllUsers(): Promise<SafeUser[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  return users.map(toSafeUser);
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'name' | 'passwordHash' | 'role' | 'accountStatus' | 'requestedRole' | 'twoFactorEnabled' | 'twoFactorSecret' | 'backupCodes'>>,
): Promise<SafeUser | undefined> {
  if (id === 'super-admin-env') return undefined; // Cannot update env super admin

  const docRef = doc(db, 'users', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return undefined;

  const finalUpdates = { ...updates };
  if (updates.passwordHash && typeof updates.passwordHash === 'string' && !updates.passwordHash.startsWith('$2')) {
    // Only hash if it's not already hashed (doesn't start with bcrypt prefix)
    finalUpdates.passwordHash = await hashPassword(updates.passwordHash);
  }

  await updateDoc(docRef, finalUpdates);
  const updatedSnap = await getDoc(docRef);
  return toSafeUser({ id: updatedSnap.id, ...updatedSnap.data() } as User);
}

export async function deleteUser(id: string): Promise<boolean> {
  if (id === 'super-admin-env') return false;
  await deleteDoc(doc(db, 'users', id));
  return true;
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus ?? 'active',
    requestedRole: user.requestedRole,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}
