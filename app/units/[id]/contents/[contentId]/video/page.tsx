'use client';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { logEvent, startLogger, stopLogger } from '@/lib/logger';
import { Suspense } from 'react';

interface ContentItem {
  id: string;
  type: string;
  label: string;
  file_path?: string | null;
  url?: string | null;
}

interface ContentDetail {
  id: string;
  title: string;
  items: ContentItem[];
}

function VideoPlayer({ unitId, contentId }: { unitId: string; contentId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('itemId');

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [videoItem, setVideoItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const positionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !contentId) return;

    startLogger();
    logEvent('content_open', { contentId });

    fetch(`/api/contents/${contentId}`)
      .then(r => r.json())
      .then((data: ContentDetail) => {
        setContent(data);
        // itemId指定があればそのitem、なければ最初のvideoアイテムを使用
        const item = itemId
          ? data.items.find(i => i.id === itemId)
          : data.items.find(i => i.type === 'video');
        setVideoItem(item ?? null);
        setLoading(false);
      });

    return () => {
      logEvent('content_leave', { contentId });
      stopLogger();
      if (positionTimerRef.current) clearInterval(positionTimerRef.current);
    };
  }, [status, contentId, itemId]);

  const handlePlay = () => {
    logEvent('video_play', { contentId, itemId: videoItem?.id });
    // 10秒ごとに再生位置を記録
    positionTimerRef.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        logEvent('video_position', {
          contentId,
          itemId: videoItem?.id,
          payload: { position: Math.round(videoRef.current.currentTime) },
        });
      }
    }, 10000);
  };

  const handlePause = () => {
    logEvent('video_pause', {
      contentId,
      itemId: videoItem?.id,
      payload: { position: Math.round(videoRef.current?.currentTime ?? 0) },
    });
    if (positionTimerRef.current) {
      clearInterval(positionTimerRef.current);
      positionTimerRef.current = null;
    }
  };

  const handleSeeked = () => {
    if (!videoRef.current) return;
    logEvent('video_seek', {
      contentId,
      itemId: videoItem?.id,
      payload: { to: Math.round(videoRef.current.currentTime) },
    });
  };

  const handleEnded = () => {
    logEvent('video_ended', { contentId, itemId: videoItem?.id });
    if (positionTimerRef.current) {
      clearInterval(positionTimerRef.current);
      positionTimerRef.current = null;
    }
    // 動画終了時に progress を in_progress に更新（まだ未完了なら）
    fetch(`/api/contents/${contentId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
  };

  const f = { fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ color: '#9ca3af', fontSize: 14 }}>読み込み中...</div>
    </div>
  );

  const videoPath = videoItem?.file_path ?? videoItem?.url ?? null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', ...f }}>
      <Header />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
          <Link href={`/units/${unitId}/contents/${contentId}`} style={{ color: '#378ADD', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> コンテンツに戻る
          </Link>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 24 }}>
          {content?.title} — 学習動画
        </h1>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          {!videoPath ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#9ca3af' }}>
              <AlertCircle size={40} style={{ marginBottom: 12, color: '#fca5a5' }} />
              <p style={{ fontWeight: 500 }}>動画がまだアップロードされていません</p>
            </div>
          ) : videoError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#f87171' }}>
              <AlertCircle size={40} style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 500 }}>動画を読み込めませんでした</p>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>ファイルが破損しているか、形式がサポートされていない可能性があります</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videoPath}
              controls
              style={{ width: '100%', maxHeight: '70vh', background: '#000', display: 'block' }}
              onError={() => setVideoError(true)}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeeked}
              onEnded={handleEnded}
            >
              お使いのブラウザは動画再生をサポートしていません。
            </video>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VideoPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const [ids, setIds] = useState<{ unitId: string; contentId: string } | null>(null);

  useEffect(() => {
    params.then(({ id, contentId }) => setIds({ unitId: id, contentId }));
  }, [params]);

  if (!ids) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ color: '#9ca3af', fontSize: 14 }}>読み込み中...</div>
    </div>
  );

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#9ca3af' }}>読み込み中...</div></div>}>
      <VideoPlayer unitId={ids.unitId} contentId={ids.contentId} />
    </Suspense>
  );
}