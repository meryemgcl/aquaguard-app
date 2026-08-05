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
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'admin') {
        router.replace('/profil');
      } else {
        fetchUsers();
      }
    }
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Kullanıcılar yüklenemedi.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => u.id === id ? { ...u, role: data.user.role } : u));
        // You could add toast notification here
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Rol güncellenemedi.');
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
    } catch (err) {
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

  if (user?.role !== 'admin') return null;

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
                  <select 
                    className={styles.roleSelect} 
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === user.id} // Kendisini değiştiremesin
                  >
                    <option value="halk">Vatandaş (Halk)</option>
                    <option value="uzman">Çevre Uzmanı</option>
                    <option value="yonetici">Bölge Yöneticisi</option>
                    <option value="admin">Sistem Admini</option>
                  </select>
                </td>
                <td>
                  <div className={styles.actions}>
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
