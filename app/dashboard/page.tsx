'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronRight, Trophy, TrendingUp } from 'lucide-react';

interface Unit {
  id: string;
  title: string;
  description: string;
  order: number;
  total_contents: number;
  completed_contents: number;
  lock_unit_title?: string | null; // ロック条件の単元名
}

const UNIT_COLORS = [
  { accent: '#378ADD', bg: 'rgba(55,138,221,0.1)', text: '#378ADD' },
  { accent: '#1D9E75', bg: 'rgba(29,158,117,0.1)', text: '#1D9E75' },
  { accent: '#9B59B6', bg: 'rgba(155,89,182,0.1)', text: '#9B59B6' },
  { accent: '#E67E22', bg: 'rgba(230,126,34,0.1)',  text: '#E67E22' },
  { accent: '#E74C3C', bg: 'rgba(231,76,60,0.1)',   text: '#E74C3C' },
];

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
        <div style={{ color: '#9ca3af', fontSize: 14 }}>読み込み中...</div>
      </div>
    );
  }

  const totalContents = units.reduce((s, u) => s + u.total_contents, 0);
  const totalCompleted = units.reduce((s, u) => s + u.completed_contents, 0);
  const overallPct = totalContents > 0 ? Math.round((totalCompleted / totalContents) * 100) : 0;
  const name = session?.user?.name ?? '';

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' }}>
      <Header />

      {/* Hero */}
      <div style={{ background: '#0f1c2e', padding: '28px 28px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, bottom: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(55,138,221,0.07)' }} />
        <p style={{ fontSize: 11, color: '#4d7fa8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>ようこそ</p>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#e8edf4', marginBottom: 20 }}>{name} さん</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { icon: <Trophy size={16} />, num: totalCompleted, sub: totalContents, label: 'コンテンツ修了' },
            { icon: <TrendingUp size={16} />, num: overallPct, sub: null, label: '全体進捗', unit: '%' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(55,138,221,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#378ADD' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#e8edf4', lineHeight: 1 }}>
                  {stat.num}
                  {stat.sub !== null
                    ? <span style={{ fontSize: 13, fontWeight: 400, color: '#4d7fa8' }}> / {stat.sub}</span>
                    : <span style={{ fontSize: 13, fontWeight: 400, color: '#4d7fa8' }}>{stat.unit}</span>
                  }
                </div>
                <div style={{ fontSize: 11, color: '#4d7fa8', marginTop: 2 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unit grid */}
      <div style={{ padding: '24px 28px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          学習単元一覧
          <div style={{ flex: 1, height: '0.5px', background: '#e5e7eb' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {units.map((unit, idx) => {
            const color = UNIT_COLORS[idx % UNIT_COLORS.length];
            const pct = unit.total_contents > 0 ? Math.round((unit.completed_contents / unit.total_contents) * 100) : 0;
            const isLocked = !!unit.lock_unit_title;

            return isLocked ? (
              // Locked card
              <div key={unit.id} style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#9ca3af', borderRadius: '12px 12px 0 0', opacity: 0.3 }} />
                {/* Lock icon top-right */}
                <div style={{ position: 'absolute', top: 14, right: 14, width: 22, height: 22, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#d97706' }}>🔒</div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 18, opacity: 0.4 }}>📘</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{unit.title}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5, marginBottom: 10 }}>{unit.description}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef9ec', border: '0.5px solid #fcd34d', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 500, color: '#92400e' }}>
                  🔒 閲覧条件：{unit.lock_unit_title}の学習終了
                </div>
              </div>
            ) : (
              // Normal card
              <Link key={unit.id} href={`/units/${unit.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color.accent, borderRadius: '12px 12px 0 0' }} />
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: color.bg, color: color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>📘</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{unit.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 14 }}>{unit.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{unit.completed_contents} / {unit.total_contents} コンテンツ</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color.accent, borderRadius: 99 }} />
                  </div>
                  <ChevronRight size={16} style={{ position: 'absolute', bottom: 16, right: 16, color: '#d1d5db' }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
