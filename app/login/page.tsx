'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BookOpen, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [personalId, setPersonalId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      personal_id: personalId,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('IDまたはパスワードが正しくありません');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
      {/* Top bar */}
      <div className="px-8 py-5 flex items-center gap-3">
        <BookOpen size={24} className="text-white" />
        <span className="text-white font-bold text-lg">数学学習ポータル</span>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Card header */}
          <div className="px-8 py-6 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">ログイン</h1>
            <p className="text-sm text-gray-500 mt-1">学習ポータルにアクセスするにはログインしてください</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">学籍番号 / ID</label>
              <input
                type="text"
                value={personalId}
                onChange={e => setPersonalId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="例：student01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                  placeholder="パスワードを入力"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-50"
              style={{ background: loading ? '#9ca3af' : 'linear-gradient(to right, #1a3a5c, #2563a8)' }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">ログインに問題がある場合は担当教員に連絡してください</p>
          </div>
        </div>
      </div>
    </div>
  );
}
