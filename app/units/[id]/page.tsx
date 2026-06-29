'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronLeft, Play, FileText, Upload, CheckCircle, Lock } from 'lucide-react';

interface Content {
  id: string;
  title: string;
  description: string;
  order: number;
  has_video: boolean;
  has_textbook: boolean;
  has_assignment: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  is_locked: boolean;
  lock_conditions: string[];
}

interface Unit {
  id: string;
  title: string;
  description: string;
}

const statusConfig = {
  not_started: { label: '未着手',  badge: { background: '#f3f4f6', color: '#6b7280' } },
  in_progress:  { label: '学習中',  badge: { background: '#dbeafe', color: '#1d4ed8' } },
  completed:    { label: '完了',    badge: { background: '#dcfce7', color: '#15803d' } },
};

export default function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { status } = useSession();
  const router = useRouter();
  const [unitId, setUnitId] = useState('');
  const [unit, setUnit] = useState<Unit | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { params.then(({ id }) => setUnitId(id)); }, [params]);
  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && unitId) {
      fetch(`/api/units/${unitId}`)
        .then(r => r.json())
        .then(data => { setUnit(data.unit); setContents(data.contents); setLoading(false); });
    }
  }, [status, unitId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ color: '#9ca3af', fontSize: 14 }}>読み込み中...</div>
    </div>
  );
  if (!unit) return null;

  const completed = contents.filter(c => c.status === 'completed').length;
  const pct = contents.length > 0 ? Math.round((completed / contents.length) * 100) : 0;

  const f = { fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' };

  // ロックされたコンテンツの「条件となるコンテンツ名」を取得
  const getLockedByTitle = (content: Content) => {
    if (!content.is_locked || content.lock_conditions.length === 0) return null;
    const dep = contents.find(c => content.lock_conditions.includes(c.id));
    return dep?.title ?? null;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', ...f }}>
      <Header />

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9ca3af' }}>
        <Link href="/dashboard" style={{ color: '#378ADD', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
          <ChevronLeft size={14} /> トップ
        </Link>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span style={{ color: '#374151', fontWeight: 500 }}>{unit.title}</span>
      </div>

      {/* Unit hero */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '24px 28px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{unit.title}</h1>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{unit.description}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#378ADD', lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>進捗</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 5, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#378ADD', borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
          <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>{completed} / {contents.length} 完了</span>
        </div>
      </div>

      {/* Content list */}
      <div style={{ padding: '24px 28px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          コンテンツ一覧
          <div style={{ flex: 1, height: '0.5px', background: '#e5e7eb' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contents.map((content, idx) => {
            const isLocked = content.is_locked;
            const lockedByTitle = getLockedByTitle(content);
            const sc = statusConfig[content.status];

            return (
              <div key={content.id} style={{ background: isLocked ? '#f9fafb' : '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16, opacity: isLocked ? 0.85 : 1 }}>

                {/* 番号バッジ */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                  background: content.status === 'completed' ? '#dcfce7' : content.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
                  color: content.status === 'completed' ? '#16a34a' : content.status === 'in_progress' ? '#2563eb' : '#6b7280',
                }}>
                  {content.status === 'completed' ? <CheckCircle size={14} /> : idx + 1}
                </div>

                {/* 本文 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: isLocked ? '#6b7280' : '#111827', marginBottom: 4, lineHeight: 1.4 }}>
                    {content.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12, lineHeight: 1.5 }}>
                    {content.description}
                  </div>

                  {/* タイプボタン */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {content.has_video && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#eff6ff', border: '0.5px solid #bfdbfe', color: '#2563eb', opacity: isLocked ? 0.4 : 1 }}>
                        <Play size={11} /> 動画
                      </span>
                    )}
                    {content.has_textbook && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#faf5ff', border: '0.5px solid #e9d5ff', color: '#7c3aed', opacity: isLocked ? 0.4 : 1 }}>
                        <FileText size={11} /> テキスト
                      </span>
                    )}
                    {content.has_assignment && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#fff7ed', border: '0.5px solid #fed7aa', color: '#c2410c', opacity: isLocked ? 0.4 : 1 }}>
                        <Upload size={11} /> 課題
                      </span>
                    )}
                  </div>

                  {/* ロック条件 */}
                  {isLocked && lockedByTitle && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, background: '#fef9ec', border: '0.5px solid #fcd34d', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500, color: '#92400e' }}>
                      <Lock size={11} /> 閲覧条件：{lockedByTitle}の学習終了
                    </div>
                  )}
                </div>

                {/* 右側：バッジ＋ボタン */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                  {isLocked ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
                      <Lock size={11} /> ロック中
                    </span>
                  ) : (
                    <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, ...sc.badge }}>
                        {content.status === 'completed' && <CheckCircle size={11} />}
                        {sc.label}
                      </span>
                      <Link
                        href={`/units/${unitId}/contents/${content.id}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: '#0f1c2e', color: '#e8edf4', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
                      >
                        {content.status === 'completed' ? '見直す' : '学習する'} →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
