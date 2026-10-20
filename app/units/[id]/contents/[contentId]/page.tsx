'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import { ChevronLeft, Play, FileText, CheckCircle, Lock } from 'lucide-react';

const QuestionCard = dynamic(() => import('@/components/QuestionCard'), { ssr: false });

interface ContentItem {
  id: string;
  type: string;   // 'video' | 'pdf' | 'link' | 'question'
  label: string;  // '学習用' | '解答用' | '参考資料'
  file_path?: string | null;
  url?: string | null;
  order: number;
  unlock_after_item_id?: string | null;
  question_id?: string | null;
}

interface ContentDetail {
  id: string;
  unit_id: string;
  title: string;
  description: string;
  lock_conditions: string[];
  items: ContentItem[];
}

const f = { fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' };

export default function ContentPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const { status } = useSession();
  const router = useRouter();
  const [unitId, setUnitId] = useState('');
  const [contentId, setContentId] = useState('');
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [progressStatus, setProgressStatus] = useState('not_started');
  const [clickedItems, setClickedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => { params.then(({ id, contentId }) => { setUnitId(id); setContentId(contentId); }); }, [params]);
  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  const fetchData = async (cid: string) => {
    const [contentRes, progressRes] = await Promise.all([
      fetch(`/api/contents/${cid}`).then(r => r.json()),
      fetch(`/api/contents/${cid}/progress`).then(r => r.json()),
    ]);
    setContent(contentRes);
    setProgressStatus(progressRes.progress?.status ?? 'not_started');
    setLoading(false);
  };

  useEffect(() => { if (status === 'authenticated' && contentId) fetchData(contentId); }, [status, contentId]);

  // Called when a student clicks/completes an item
  const handleItemClick = async (item: ContentItem) => {
    if (clickedItems.has(item.id)) return; // already clicked
    const newClicked = new Set(clickedItems);
    newClicked.add(item.id);
    setClickedItems(newClicked);

    // Log event
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          event: 'item_completed',
          contentId: contentId,
          itemId: item.id,
          client_time: new Date().toISOString(),
          payload: { type: item.type },
        }],
      }),
    });

    // Update progress status to completed (clicking any item = completed)
    if (progressStatus !== 'completed') {
      setProgressStatus('completed');
      await fetch(`/api/contents/${contentId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ color: '#9ca3af', fontSize: 14 }}>読み込み中...</div>
    </div>
  );
  if (!content) return null;

  const isCompleted = progressStatus === 'completed';

  // Sort items by order
  const sortedItems = [...(content.items ?? [])].sort((a, b) => a.order - b.order);

  // Check if an item is unlocked
  const isUnlocked = (item: ContentItem): boolean => {
    if (!item.unlock_after_item_id) return true;
    return clickedItems.has(item.unlock_after_item_id);
  };

  const renderItem = (item: ContentItem) => {
    const unlocked = isUnlocked(item);

    if (!unlocked) {
      // Find what unlocks this
      const prerequisite = sortedItems.find(i => i.id === item.unlock_after_item_id);
      return (
        <div key={item.id} style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, opacity: 0.6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Lock size={18} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 2 }}>{item.label}</div>
            {prerequisite && (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>「{prerequisite.label}」を完了するとアンロックされます</div>
            )}
          </div>
        </div>
      );
    }

    if (item.type === 'question') {
      if (!item.question_id) return null;
      return (
        <div key={item.id} onClick={() => handleItemClick(item)}>
          <QuestionCard questionId={item.question_id} onAnswered={() => handleItemClick(item)} />
        </div>
      );
    }

    const isVideo = item.type === 'video';
    const isPdf = item.type === 'pdf';
    const isLink = item.type === 'link';
    const isDone = clickedItems.has(item.id);

    const href = isVideo
      ? `/units/${unitId}/contents/${contentId}/video?itemId=${item.id}`
      : isPdf
      ? `/units/${unitId}/contents/${contentId}/pdf?itemId=${item.id}`
      : (item.url ?? '#');

    const iconBg = isVideo ? '#eff6ff' : isPdf ? '#faf5ff' : '#f0fdf4';
    const iconColor = isVideo ? '#2563eb' : isPdf ? '#7c3aed' : '#16a34a';
    const Icon = isVideo ? Play : FileText;
    const actionLabel = isVideo ? '動画を視聴 →' : isPdf ? 'テキストを閲覧 →' : 'リンクを開く →';
    const itemTitle = item.label === '学習用'
      ? (isVideo ? '学習動画' : '学習テキスト')
      : item.label;

    const handleClick = () => {
      handleItemClick(item);
    };

    return (
      <div key={item.id} style={{ background: '#fff', border: `0.5px solid ${isDone ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.2s' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            {itemTitle}
            {isDone && <CheckCircle size={14} color="#16a34a" />}
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          {(item.file_path || item.url) ? (
            isLink ? (
              <a href={href} target="_blank" rel="noopener noreferrer"
                onClick={handleClick}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, background: '#0f1c2e', color: '#e8edf4', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                {actionLabel}
              </a>
            ) : (
              <Link href={href}
                onClick={handleClick}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, background: '#0f1c2e', color: '#e8edf4', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                {actionLabel}
              </Link>
            )
          ) : (
            <span style={{ fontSize: 12, color: '#d1d5db' }}>未アップロード</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', ...f }}>
      <Header />

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9ca3af' }}>
        <Link href="/dashboard" style={{ color: '#378ADD', textDecoration: 'none' }}>トップ</Link>
        <span style={{ color: '#d1d5db' }}>/</span>
        <Link href={`/units/${unitId}`} style={{ color: '#378ADD', textDecoration: 'none' }}>単元</Link>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span style={{ color: '#374151', fontWeight: 500 }}>{content.title}</span>
      </div>

      {/* Hero */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{content.title}</h1>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{content.description}</p>
        </div>
        {isCompleted && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            <CheckCircle size={13} /> 完了
          </span>
        )}
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 760 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {sortedItems.map(item => renderItem(item))}
          {sortedItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>
              コンテンツが追加されていません
            </div>
          )}
        </div>

        <Link href={`/units/${unitId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#378ADD', textDecoration: 'none', marginTop: 8 }}>
          <ChevronLeft size={14} /> 単元ページに戻る
        </Link>
      </div>
    </div>
  );
}