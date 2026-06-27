'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronRight, ChevronLeft, Lock, CheckCircle, Circle, BookOpen, Play, FileText, Upload } from 'lucide-react';

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
}

interface Unit {
  id: string;
  title: string;
  description: string;
}

const statusLabel = { not_started: '未着手', in_progress: '学習中', completed: '完了' };
const statusClass = { not_started: 'status-not-started', in_progress: 'status-in-progress', completed: 'status-completed' };
const statusIcon = {
  not_started: <Circle size={16} className="text-gray-400" />,
  in_progress: <Circle size={16} className="text-blue-500" />,
  completed: <CheckCircle size={16} className="text-green-500" />,
};

export default function UnitPage({ params }: { params: { id: string } }) {
  const { status } = useSession();
  const router = useRouter();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch(`/api/units/${params.id}`)
        .then(r => r.json())
        .then(data => { setUnit(data.unit); setContents(data.contents); setLoading(false); });
    }
  }, [status, params.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">読み込み中...</div>
    </div>
  );

  if (!unit) return null;

  const completed = contents.filter(c => c.status === 'completed').length;
  const pct = contents.length > 0 ? Math.round((completed / contents.length) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
          <Link href="/dashboard" className="hover:text-blue-600 flex items-center gap-1">
            <ChevronLeft size={14} /> トップ
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">{unit.title}</span>
        </div>

        {/* Unit header */}
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{unit.title}</h1>
              <p className="text-gray-500">{unit.description}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-blue-600">{pct}%</div>
              <div className="text-xs text-gray-400">進捗</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{completed} / {contents.length} 完了</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Contents list */}
        <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">コンテンツ一覧</h2>
        <div className="space-y-3">
          {contents.map((content, idx) => (
            <div key={content.id} className={`card p-4 ${content.is_locked ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="text-gray-400 font-mono text-sm w-6 text-center">{String(idx + 1).padStart(2, '0')}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon[content.status]}
                    <span className="font-semibold text-gray-900 truncate">{content.title}</span>
                    {content.is_locked && <Lock size={14} className="text-amber-500 shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{content.description}</p>
                  {/* Icons for content types */}
                  <div className="flex gap-2 mt-2">
                    {content.has_video && <span className="flex items-center gap-1 text-xs text-blue-500"><Play size={12} />動画</span>}
                    {content.has_textbook && <span className="flex items-center gap-1 text-xs text-purple-500"><FileText size={12} />テキスト</span>}
                    {content.has_assignment && <span className="flex items-center gap-1 text-xs text-orange-500"><Upload size={12} />課題</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`status-badge ${content.is_locked ? 'status-locked' : statusClass[content.status]}`}>
                    {content.is_locked ? '🔒 ロック中' : statusLabel[content.status]}
                  </span>
                  {!content.is_locked && (
                    <Link href={`/units/${params.id}/contents/${content.id}`} className="btn-primary text-sm">
                      <ChevronRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
