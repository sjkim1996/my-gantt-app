/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpDown, Lock, Plus, RefreshCw, Save, Shield, Trash2, Users } from 'lucide-react';
import styles from './styles/Accounts.module.css';
import { UserRole } from '@/lib/authShared';

type Account = {
  _id: string;
  userId: string;
  password: string;
  role: UserRole;
  team?: string;
};

type SessionUser = { id: string; role: UserRole; label?: string };

const roleWeight: Record<UserRole, number> = { admin: 0, lead: 1, member: 2 };

export default function AccountsPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState<{ text: string; tone?: 'error' | 'success' } | null>(null);
  const [sortBy, setSortBy] = useState<'role' | 'team'>('role');
  const [drafts, setDrafts] = useState<Record<string, Account>>({});
  const [creating, setCreating] = useState<{ userId: string; password: string; team: string; role: UserRole }>({
    userId: '',
    password: '',
    team: '',
    role: 'member',
  });

  const showBanner = (text: string, tone: 'error' | 'success' = 'success') => {
    setBanner({ text, tone });
    setTimeout(() => setBanner(null), 3000);
  };

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        router.replace('/login');
        return;
      }
      if (data.data?.role !== 'admin') {
        setError('관리자만 접근할 수 있습니다.');
        setLoading(false);
        return;
      }
      setSession(data.data);
    } catch (err) {
      console.error('[ACCOUNT] session', err);
      setError('세션을 확인할 수 없습니다.');
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || '계정 목록을 불러오지 못했습니다.');
        return;
      }
      setAccounts(data.data);
    } catch (err) {
      console.error('[ACCOUNT] fetch', err);
      setError('계정 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await fetchSession();
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (session?.role === 'admin') {
      void fetchAccounts();
    }
  }, [session]);

  useEffect(() => {
    setDrafts(
      accounts.reduce<Record<string, Account>>((acc, cur) => {
        acc[cur._id] = { ...cur };
        return acc;
      }, {})
    );
  }, [accounts]);

  const sortedAccounts = useMemo(() => {
    const arr = [...accounts];
    if (sortBy === 'role') {
      arr.sort((a, b) => {
        if (roleWeight[a.role] === roleWeight[b.role]) return a.userId.localeCompare(b.userId);
        return roleWeight[a.role] - roleWeight[b.role];
      });
    } else {
      arr.sort((a, b) => {
        const teamA = (a.team || '').toLowerCase();
        const teamB = (b.team || '').toLowerCase();
        if (teamA === teamB) return a.userId.localeCompare(b.userId);
        return teamA.localeCompare(teamB);
      });
    }
    return arr;
  }, [accounts, sortBy]);

  const updateDraft = (id: string, field: keyof Account, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } as Account }));
  };

  const handleCreate = async () => {
    if (!creating.userId.trim() || !creating.password.trim()) {
      showBanner('ID와 비밀번호를 입력하세요.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creating),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        showBanner(data?.error || '계정 생성에 실패했습니다.', 'error');
        return;
      }
      showBanner('계정이 추가되었습니다.');
      setCreating({ userId: '', password: '', team: '', role: 'member' });
      await fetchAccounts();
    } catch (err) {
      console.error('[ACCOUNT] create', err);
      showBanner('계정 생성에 실패했습니다.', 'error');
    }
  };

  const handleUpdate = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    if (!draft.userId.trim() || !draft.password.trim()) {
      showBanner('ID와 비밀번호를 비워둘 수 없습니다.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, _id: id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        showBanner(data?.error || '업데이트에 실패했습니다.', 'error');
        return;
      }
      showBanner('계정이 저장되었습니다.');
      await fetchAccounts();
    } catch (err) {
      console.error('[ACCOUNT] update', err);
      showBanner('업데이트에 실패했습니다.', 'error');
    }
  };

  const handleSaveAll = async () => {
    const changed = accounts.filter((acc) => {
      const draft = drafts[acc._id];
      if (!draft) return false;
      return (
        draft.userId !== acc.userId ||
        draft.password !== acc.password ||
        draft.team !== acc.team ||
        draft.role !== acc.role
      );
    });

    if (!changed.length) {
      showBanner('변동된 항목이 없습니다.', 'error');
      return;
    }

    for (const acc of changed) {
      const draft = drafts[acc._id];
      if (!draft.userId.trim() || !draft.password.trim()) {
        showBanner('ID와 비밀번호를 비워둘 수 없습니다.', 'error');
        return;
      }
    }

    try {
      await Promise.all(
        changed.map((acc) =>
          fetch('/api/accounts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...drafts[acc._id], _id: acc._id }),
          }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => null);
              throw new Error(data?.error || '업데이트 실패');
            }
            return res;
          })
        )
      );
      showBanner('변동사항을 모두 저장했습니다.');
      await fetchAccounts();
    } catch (err) {
      console.error('[ACCOUNT] bulk save', err);
      const message = err instanceof Error ? err.message : '저장에 실패했습니다.';
      showBanner(message, 'error');
    }
  };

  const handleDelete = async (id: string, userId: string) => {
    const confirmed = window.confirm(`${userId} 계정을 삭제할까요?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/accounts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        showBanner(data?.error || '삭제에 실패했습니다.', 'error');
        return;
      }
      showBanner('계정이 삭제되었습니다.');
      await fetchAccounts();
    } catch (err) {
      console.error('[ACCOUNT] delete', err);
      showBanner('삭제에 실패했습니다.', 'error');
    }
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.errorText}>{error}</p>
          <div className={styles.footerLinks}>
            <Link href="/admin/project_management" className={styles.linkButton}>
              간트 차트로 이동
            </Link>
            <Link href="/login" className={styles.linkGhost}>
              로그인
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <div className={styles.iconCircle}>
            <Shield className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>계정 관리</h1>
              <span className={styles.badge}>Admin only</span>
            </div>
            <p className={styles.subtitle}>구성원 계정을 생성 · 수정 · 삭제하고 권한과 팀을 정렬하세요.</p>
          </div>
        </div>
        <div className={styles.toolbar}>
          <button onClick={() => void fetchAccounts()} className={styles.iconButton} title="새로고침">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/admin/project_management" className={styles.primaryLink}>
            <Users className="w-4 h-4" />
            리소스 대시보드
          </Link>
        </div>
      </div>

      {banner && (
        <div className={`${styles.banner} ${banner.tone === 'error' ? styles.bannerError : styles.bannerSuccess}`}>
          {banner.tone === 'error' ? <Lock className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          <span>{banner.text}</span>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.formGrid}>
          <div>
            <label className={styles.label}>ID</label>
            <input
              value={creating.userId}
              onChange={(e) => setCreating((prev) => ({ ...prev, userId: e.target.value }))}
              className={styles.input}
              placeholder="예) capra_001"
            />
          </div>
          <div>
            <label className={styles.label}>비밀번호</label>
            <input
              type="text"
              value={creating.password}
              onChange={(e) => setCreating((prev) => ({ ...prev, password: e.target.value }))}
              className={styles.input}
              placeholder="공백 불가"
            />
          </div>
          <div>
            <label className={styles.label}>팀</label>
            <input
              value={creating.team}
              onChange={(e) => setCreating((prev) => ({ ...prev, team: e.target.value }))}
              className={styles.input}
              placeholder="예) 개발팀"
            />
          </div>
          <div>
            <label className={styles.label}>권한</label>
            <select
              value={creating.role}
              onChange={(e) => setCreating((prev) => ({ ...prev, role: e.target.value as UserRole }))}
              className={styles.select}
            >
              <option value="admin">admin</option>
              <option value="lead">lead</option>
              <option value="member">member</option>
            </select>
          </div>
        </div>
        <div className={styles.formActions}>
          <button onClick={handleCreate} className={styles.primaryButton}>
            <Plus className="w-4 h-4" />
            계정 추가
          </button>
          <p className={styles.helper}>관리자만 추가/수정/삭제 가능합니다. 비밀번호는 비워둘 수 없습니다.</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.listHeader}>
          <div className={styles.listTitle}>
            <ArrowUpDown className="w-4 h-4" />
            <span>계정 목록</span>
          </div>
          <div className={styles.sortButtons}>
            <button
              onClick={() => setSortBy('role')}
              className={`${styles.sortButton} ${sortBy === 'role' ? styles.sortActive : ''}`}
            >
              권한순
            </button>
            <button
              onClick={() => setSortBy('team')}
              className={`${styles.sortButton} ${sortBy === 'team' ? styles.sortActive : ''}`}
            >
              팀순
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.empty}>불러오는 중...</div>
        ) : sortedAccounts.length === 0 ? (
          <div className={styles.empty}>등록된 계정이 없습니다.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>비밀번호</th>
                  <th>팀</th>
                  <th>권한</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedAccounts.map((acc) => {
                  const draft = drafts[acc._id] || acc;
                  return (
                    <tr key={acc._id}>
                      <td>
                        <input
                          value={draft.userId}
                          onChange={(e) => updateDraft(acc._id, 'userId', e.target.value)}
                          className={styles.inputBare}
                        />
                      </td>
                      <td>
                        <input
                          value={draft.password}
                          onChange={(e) => updateDraft(acc._id, 'password', e.target.value)}
                          className={styles.inputBare}
                        />
                      </td>
                      <td>
                        <input
                          value={draft.team || ''}
                          onChange={(e) => updateDraft(acc._id, 'team', e.target.value)}
                          className={styles.inputBare}
                          placeholder="팀 없음"
                        />
                      </td>
                      <td>
                        <select
                          value={draft.role}
                          onChange={(e) => updateDraft(acc._id, 'role', e.target.value)}
                          className={styles.selectBare}
                        >
                          <option value="admin">admin</option>
                          <option value="lead">lead</option>
                          <option value="member">member</option>
                        </select>
                      </td>
                      <td className={styles.rowActions}>
                        <button onClick={() => handleUpdate(acc._id)} className={styles.saveButton}>
                          <Save className="w-4 h-4" />
                          저장
                        </button>
                        <button onClick={() => handleDelete(acc._id, acc.userId)} className={styles.deleteButton}>
                          <Trash2 className="w-4 h-4" />
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className={styles.bulkSaveBar}>
              <button onClick={handleSaveAll} className={styles.primaryButton}>
                변동사항 모두 저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
