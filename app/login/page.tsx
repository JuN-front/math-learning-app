'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [personalId, setPersonalId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'user' | 'admin'>('user');
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
      setError('IDまたはパスワードが正しくありません。');
    } else {
      router.push(role === 'admin' ? '/admin' : '/dashboard');
    }
  };

  const s = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f5',
      padding: '24px',
      fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif',
    } as React.CSSProperties,
    shell: {
      display: 'flex',
      width: '100%',
      maxWidth: '860px',
      minHeight: '540px',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
    } as React.CSSProperties,
    left: {
      width: '52%',
      background: '#0f1c2e',
      padding: '32px 44px 48px',
      display: 'flex',
      flexDirection: 'column' as const,
      position: 'relative' as const,
      overflow: 'hidden',
    } as React.CSSProperties,
    right: {
      width: '48%',
      padding: '48px 44px',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      background: '#ffffff',
    } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <div style={s.shell}>
        {/* Left panel */}
        <div style={s.left}>
          {/* decorative circles */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(55,138,221,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(55,138,221,0.05)' }} />

          {/* Top: Provided by */}
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}>
            <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4d7fa8' }}>
              Provided by Institute of Science Tokyo
            </p>
          </div>

          {/* Middle: App name */}
          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 52, fontWeight: 600, color: '#e8edf4', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 14 }}>
              Math<span style={{ color: '#378ADD' }}>Lab</span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7f96', lineHeight: 1.7, maxWidth: 260 }}>
              問題の解き方を言語化することで、数学的理解を根本から鍛える学習プラットフォーム。
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div style={s.right}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>
            アクセス
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: '#111827', marginBottom: 6 }}>
            ログイン
          </h2>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 28, lineHeight: 1.6 }}>
            配布されたIDとパスワードでログインしてください。
          </p>

          {/* Role toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['user', 'admin'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  flex: 1, height: 32, borderRadius: 6, cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  border: role === r ? 'none' : '0.5px solid #e5e7eb',
                  background: role === r ? '#0f1c2e' : 'transparent',
                  color: role === r ? '#e8edf4' : '#9ca3af',
                  fontFamily: 'inherit',
                }}
              >
                {r === 'user' ? '生徒' : '教員・管理者'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* ID */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                学籍番号 / ID
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 2v3M8 2v3M2 10h20"/></svg>
                <input
                  type="text"
                  value={personalId}
                  onChange={e => setPersonalId(e.target.value)}
                  placeholder="例：student01"
                  required
                  style={{ width: '100%', height: 40, background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 8, padding: '0 12px 0 36px', fontSize: 14, color: '#111827', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#378ADD'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                パスワード
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  required
                  style={{ width: '100%', height: 40, background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 8, padding: '0 40px 0 36px', fontSize: 14, color: '#111827', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#378ADD'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                >
                  {showPassword
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', height: 40, background: loading ? '#6b7280' : '#0f1c2e', color: '#e8edf4', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, fontFamily: 'inherit' }}
            >
              {loading ? '確認中...' : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  ログイン
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '0.5px solid #f3f4f6', fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
            ログインに問題がある場合は担当者に連絡してください
          </div>
        </div>
      </div>
    </div>
  );
}
