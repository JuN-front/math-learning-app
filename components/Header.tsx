'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { BookOpen, LogOut, Settings, User } from 'lucide-react';

export default function Header() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  return (
    <header className="portal-header shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-0 flex items-center justify-between">
        {/* Logo & Title */}
        <Link href="/dashboard" className="flex items-center gap-3 py-4 hover:opacity-90 transition-opacity">
          <div className="bg-white/10 rounded-lg p-2">
            <BookOpen size={22} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">数学学習ポータル</div>
            <div className="text-blue-200 text-xs">Math Learning Portal</div>
          </div>
        </Link>

        {/* Nav */}
        {session && (
          <nav className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/admin" className="flex items-center gap-2 px-4 py-2 rounded-md text-blue-100 hover:bg-white/10 text-sm transition-colors">
                <Settings size={16} />
                管理者画面
              </Link>
            )}
            <div className="flex items-center gap-2 px-4 py-2 text-blue-100 text-sm border-l border-white/20 ml-2">
              <User size={16} />
              <span>{session.user?.name}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-blue-100 hover:bg-white/10 text-sm transition-colors"
            >
              <LogOut size={16} />
              ログアウト
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
