'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { setLoginToken } from '@/lib/auth';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-96">
        <div className="flex justify-center mb-6">
            <div className="bg-indigo-100 p-3 rounded-full">
                <Lock className="w-6 h-6 text-indigo-600" />
            </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Capra Admin</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">ID</label>
            <input 
              type="text" 
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none text-black"
              placeholder="아이디"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">Password</label>
            <input 
              type="password" 
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none text-black"
              placeholder="비밀번호"
            />
          </div>
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition">
            로그인
          </button>
        </div>
      </form>
    </div>
  );
}
