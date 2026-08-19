import { User, SafeUser, UserRole } from './types';
import { hashPassword } from './auth';
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, deleteDoc, updateDoc } from 'firebase/firestore';

export async function findUserByEmail(email: string): Promise<User | undefined> {
  // Super Admin check from ENV
  if (email === process.env.SUPER_ADMIN_EMAIL) {
    const hash = await hashPassword(process.env.SUPER_ADMIN_PASSWORD || 'super123');
    return {
      id: 'super-admin-env',
      name: 'Super Admin',
      email: email,
      passwordHash: hash,
      role: 'super_admin',
      createdAt: new Date().toISOString(),
    };
  }

  const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
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
  role?: User['role'];
}): Promise<SafeUser> {
  const existing = await findUserByEmail(data.email);
  if (existing) throw new Error('Bu e-posta adresi zaten kayıtlı.');

  const passwordHash = await hashPassword(data.password);
  const newUser: User = {
    id: String(Date.now()), // Or let Firestore generate an ID
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    role: data.role || 'halk',
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

export async function updateUser(id: string, updates: Partial<User>): Promise<SafeUser | undefined> {
  if (id === 'super-admin-env') return undefined; // Cannot update env super admin

  const docRef = doc(db, 'users', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return undefined;

  let finalUpdates = { ...updates };
  if (updates.passwordHash) {
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
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}
