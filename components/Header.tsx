'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Settings, LogOut } from 'lucide-react';

export default function Header() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';
  const name = session?.user?.name ?? '';
  const initial = name.charAt(0);

  return (
    <header style={{ background: '#0f1c2e', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: '#e8edf4', letterSpacing: '-0.01em' }}>
          Math<span style={{ color: '#378ADD' }}>Lab</span>
        </span>
      </Link>

      {session && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isAdmin && (
            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, color: '#6b8096', textDecoration: 'none', fontSize: 13 }}>
              <Settings size={14} /> 管理者画面
            </Link>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.07)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>
              {initial}
            </div>
            <span style={{ fontSize: 13, color: '#b0bec8' }}>{name}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b8096', fontSize: 13, fontFamily: 'inherit' }}
          >
            <LogOut size={14} /> ログアウト
          </button>
        </div>
      )}
    </header>
  );
}