'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronRight, BookOpen, CheckCircle, Clock, Trophy } from 'lucide-react';

interface Unit {
  id: string;
  title: string;
  description: string;
  order: number;
  total_contents: number;
  completed_contents: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/units')
        .then(r => r.json())
        .then(data => { setUnits(data); setLoading(false); });
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  const totalContents = units.reduce((s, u) => s + u.total_contents, 0);
  const totalCompleted = units.reduce((s, u) => s + u.completed_contents, 0);
  const overallPct = totalContents > 0 ? Math.round((totalCompleted / totalContents) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome banner */}
        <div className="rounded-xl p-6 mb-8 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
          <div className="relative z-10">
            <p className="text-blue-200 text-sm mb-1">ようこそ</p>
            <h1 className="text-2xl font-bold">{session?.user?.name} さん</h1>
            <p className="text-blue-100 text-sm mt-2">今日も数学を学びましょう！</p>
          </div>
          {/* Stats */}
          <div className="mt-5 flex gap-6">
            <div className="bg-white/10 rounded-lg px-4 py-3 flex items-center gap-3">
              <Trophy size={20} className="text-yellow-300" />
              <div>
                <div className="text-white font-bold text-xl">{totalCompleted}<span className="text-sm font-normal text-blue-100"> / {totalContents}</span></div>
                <div className="text-blue-200 text-xs">コンテンツ修了</div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-3 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-300" />
              <div>
                <div className="text-white font-bold text-xl">{overallPct}<span className="text-sm font-normal text-blue-100">%</span></div>
                <div className="text-blue-200 text-xs">全体進捗</div>
              </div>
            </div>
          </div>
        </div>

        {/* Units grid */}
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen size={20} className="text-blue-600" />
          学習単元一覧
        </h2>

        {units.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p>単元が登録されていません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map(unit => {
              const pct = unit.total_contents > 0 ? Math.round((unit.completed_contents / unit.total_contents) * 100) : 0;
              return (
                <Link key={unit.id} href={`/units/${unit.id}`} className="card p-5 block">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-blue-100 text-blue-700 rounded-lg p-2.5">
                      <BookOpen size={20} />
                    </div>
                    <ChevronRight size={18} className="text-gray-400 mt-1" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{unit.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{unit.description}</p>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {unit.completed_contents} / {unit.total_contents} コンテンツ
                      </span>
                      <span className="font-semibold text-blue-600">{pct}%</span>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
