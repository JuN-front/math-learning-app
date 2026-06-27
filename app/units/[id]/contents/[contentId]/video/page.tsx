'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronLeft, AlertCircle } from 'lucide-react';

export default function VideoPage({ params }: { params: { id: string; contentId: string } }) {
  const { status } = useSession();
  const router = useRouter();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch(`/api/contents/${params.contentId}`)
        .then(r => r.json())
        .then(data => {
          setContent(data);
          setLoading(false);
          // Mark video as watched
          fetch(`/api/contents/${params.contentId}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_watched: true }),
          });
        });
    }
  }, [status, params.contentId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">読み込み中...</div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
          <Link href={`/units/${params.id}/contents/${params.contentId}`} className="hover:text-blue-600 flex items-center gap-1">
            <ChevronLeft size={14} /> コンテンツに戻る
          </Link>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-6">{content?.title} — 学習動画</h1>

        <div className="card overflow-hidden">
          {!content?.video_path ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <AlertCircle size={40} className="mb-3 text-red-300" />
              <p className="font-medium">動画がまだアップロードされていません</p>
            </div>
          ) : videoError ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-400">
              <AlertCircle size={40} className="mb-3" />
              <p className="font-medium">動画を読み込めませんでした</p>
              <p className="text-sm text-gray-400 mt-1">ファイルが破損しているか、形式がサポートされていない可能性があります</p>
            </div>
          ) : (
            <video
              src={content.video_path}
              controls
              className="w-full max-h-[70vh] bg-black"
              onError={() => setVideoError(true)}
            >
              お使いのブラウザは動画再生をサポートしていません。
            </video>
          )}
        </div>
      </main>
    </div>
  );
}
