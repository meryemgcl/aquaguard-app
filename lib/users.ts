import 'server-only';

import { randomUUID } from 'node:crypto';
import { User, SafeUser, UserRole } from './types';
import database from './local-db';
import { hashPassword } from './auth';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  account_status: User['accountStatus'];
  requested_role: User['requestedRole'] | null;
  avatar: string | null;
  created_at: string;
  two_factor_enabled: number;
  two_factor_secret: string | null;
  backup_codes_json: string | null;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    accountStatus: row.account_status ?? 'active',
    requestedRole: row.requested_role ?? undefined,
    avatar: row.avatar ?? undefined,
    createdAt: row.created_at,
    twoFactorEnabled: row.two_factor_enabled === 1,
    twoFactorSecret: row.two_factor_secret ?? undefined,
    backupCodes: row.backup_codes_json ? JSON.parse(row.backup_codes_json) as string[] : undefined,
  };
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const row = database.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email.trim()) as UserRow | undefined;
  return row ? mapUser(row) : undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const row = database.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? mapUser(row) : undefined;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  requestedRole?: Extract<UserRole, 'uzman' | 'yonetici'>;
}): Promise<SafeUser> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const name = data.name.trim();
  if (!name || !normalizedEmail || data.password.length < 6) {
    throw new Error('Geçersiz kullanıcı bilgisi.');
  }

  const passwordHash = await hashPassword(data.password);
  const user: User = {
    id: randomUUID(),
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'halk',
    accountStatus: data.requestedRole ? 'pending' : 'active',
    requestedRole: data.requestedRole,
    createdAt: new Date().toISOString(),
  };

  try {
    database.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, role, account_status, requested_role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.name,
      user.email,
      user.passwordHash,
      user.role,
      user.accountStatus,
      user.requestedRole ?? null,
      user.createdAt,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Bu e-posta adresi zaten kayıtlı.');
    }
    throw error;
  }

  return toSafeUser(user);
}

export async function getAllUsers(): Promise<SafeUser[]> {
  const rows = database.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as UserRow[];
  return rows.map(row => toSafeUser(mapUser(row)));
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'name' | 'passwordHash' | 'role' | 'accountStatus' | 'requestedRole' | 'twoFactorEnabled' | 'twoFactorSecret' | 'backupCodes'>>,
): Promise<SafeUser | undefined> {
  const current = await findUserById(id);
  if (!current) return undefined;

  const updated = { ...current, ...updates };
  const passwordHash = updates.passwordHash
    ? updates.passwordHash.startsWith('$2') ? updates.passwordHash : await hashPassword(updates.passwordHash)
    : current.passwordHash;
  database.prepare(`
    UPDATE users SET
      name = ?, password_hash = ?, role = ?, account_status = ?, requested_role = ?,
      two_factor_enabled = ?, two_factor_secret = ?, backup_codes_json = ?, avatar = ?
    WHERE id = ?
  `).run(
    updated.name,
    passwordHash,
    updated.role,
    updated.accountStatus ?? 'active',
    updated.requestedRole ?? null,
    updated.twoFactorEnabled ? 1 : 0,
    updated.twoFactorSecret ?? null,
    updated.backupCodes ? JSON.stringify(updated.backupCodes) : null,
    updated.avatar ?? null,
    id,
  );

  const saved = await findUserById(id);
  return saved ? toSafeUser(saved) : undefined;
}

export async function deleteUser(id: string): Promise<boolean> {
  if (id === 'super-admin-env') return false;
  return database.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
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
    twoFactorEnabled: user.twoFactorEnabled,
  };
}
