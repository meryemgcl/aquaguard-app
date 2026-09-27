'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider/AuthProvider';
import { SafeUser } from '@/lib/types';
import styles from './page.module.css';

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      router.replace('/profil');
      return;
    }

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.success) {
          setUsers(data.users);
        } else {
          setError(data.error || 'Kullanıcılar yüklenemedi.');
        }
      } catch (caughtError: unknown) {
        setError(caughtError instanceof Error ? caughtError.message : 'Kullanıcılar yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    void fetchUsers();
  }, [user, authLoading, router]);

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, accountStatus: 'active' })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => u.id === id ? data.user : u));
      } else {
        alert(data.error);
      }
    } catch {
      alert('Rol güncellenemedi.');
    }
  };

  const handleRejectRoleRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'halk', accountStatus: 'active', decision: 'rejected' }),
      });
      const data = await res.json();
      if (data.success) setUsers(users.map(u => u.id === id ? data.user : u));
      else alert(data.error);
    } catch {
      alert('Rol başvurusu reddedilemedi.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        alert(data.error);
      }
    } catch {
      alert('Kullanıcı silinemedi.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', paddingTop: '10vh' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderBottomColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (user?.role !== 'admin' && user?.role !== 'super_admin') return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Kullanıcı Yönetimi</h1>
          <p className={styles.subtitle}>Sistemdeki tüm kullanıcıları ve yetkilerini yönetin.</p>
        </div>
      </div>

      {error && <div className={styles.alert}>⚠️ {error}</div>}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>Kayıt Tarihi</th>
              <th>Başvuru Durumu</th>
              <th>Yetki (Rol)</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={styles.name}>{u.name}</div>
                      <div className={styles.email}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
                <td>
                  {u.accountStatus === 'pending'
                    ? `Onay bekliyor (${u.requestedRole === 'uzman' ? 'Uzman' : 'Yönetici'})`
                    : u.accountStatus === 'rejected' ? 'Başvuru reddedildi' : 'Etkin'}
                </td>
                <td>
                  <select 
                    className={styles.roleSelect} 
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === user.id} // Kendisini değiştiremesin
                  >
                    <option value="halk">Vatandaş (Halk)</option>
                    <option value="uzman">Çevre Uzmanı</option>
                    <option value="yonetici">Bölge Yöneticisi</option>
                    {user.role === 'super_admin' && <option value="admin">Sistem Admini</option>}
                  </select>
                </td>
                <td>
                  <div className={styles.actions}>
                    {u.accountStatus === 'pending' && (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleRejectRoleRequest(u.id)}
                        disabled={u.id === user.id}
                      >
                        Reddet
                      </button>
                    )}
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === user.id}
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
