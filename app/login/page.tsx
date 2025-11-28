'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { setLoginToken } from '@/lib/auth';
import styles from './styles/Login.module.css';

export default function LoginPage() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 요청하신 아이디와 비밀번호
    if (id === 'capra_admin' && pw === 'capra0311!!') {
      setLoginToken();
      // 로그인 성공 시 관리자 페이지로 이동
      router.push('/admin/project_management');
    } else {
      alert('아이디 또는 비밀번호가 틀렸습니다.');
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
        <h1 className={styles.title}>Capra Admin</h1>
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
          <button className={styles.submit}>
            로그인
          </button>
        </div>
      </form>
    </div>
  );
}
