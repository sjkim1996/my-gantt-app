'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { setLoginToken } from '@/lib/auth';
import styles from './styles/Login.module.css';

export default function LoginPage() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: pw }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || '아이디 또는 비밀번호가 틀렸습니다.');
        return;
      }

      setLoginToken({ id: data.data.id, role: data.data.role, team: data.data.team });
      router.push('/admin/project_management');
    } catch (err) {
      console.error('[LOGIN]', err);
      setError('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleLogin} className={styles.form}>
        <div className={styles.iconRow}>
          <div className={styles.iconCircle}>
            <Lock className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <h1 className={styles.title}>CAPRA Admin</h1>
        <div className={styles.fieldGroup}>
          <div>
            <label className={styles.label}>ID</label>
            <input 
              type="text" 
              value={id}
              onChange={(e) => setId(e.target.value)}
              className={styles.input}
              placeholder="아이디"
            />
          </div>
          <div>
            <label className={styles.label}>Password</label>
            <input 
              type="password" 
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={styles.input}
              placeholder="비밀번호"
            />
          </div>
          <button className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? '확인 중...' : '로그인'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </form>
    </div>
  );
}
