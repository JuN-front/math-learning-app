'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronLeft, AlertCircle, FileText } from 'lucide-react';

const typeLabel: Record<string, string> = {
  textbook: '学習テキスト',
  assignment: '課題',
  answer: '解答',
};

function PDFViewer({ unitId, contentId }: { unitId: string; contentId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileType = searchParams.get('type') || 'textbook';
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && contentId) {
      fetch(`/api/contents/${contentId}`)
        .then(r => r.json())
        .then(data => {
          setContent(data);
          setLoading(false);
          if (fileType === 'textbook') {
            fetch(`/api/contents/${contentId}/progress`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ textbook_read: true }),
            });
          }
        });
    }
  }, [status, contentId, fileType]);

  const pdfPath = content?.[`${fileType}_path`];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">読み込み中...</div></div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface)' }}>
      <Header />
      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
          <Link href={`/units/${unitId}/contents/${contentId}`} className="hover:text-blue-600 flex items-center gap-1">
            <ChevronLeft size={14} /> コンテンツに戻る
          </Link>
        </div>
        <div className="flex items-center gap-2 mb-6">
          <FileText size={20} className="text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">{content?.title} — {typeLabel[fileType]}</h1>
        </div>
        <div className="card flex-1 overflow-hidden" style={{ minHeight: '70vh' }}>
          {!pdfPath ? (
            <div className="flex flex-col items-center justify-center h-80 text-gray-400">
              <AlertCircle size={40} className="mb-3 text-red-300" />
              <p className="font-medium">PDFがまだアップロードされていません</p>
            </div>
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center h-80 text-red-400">
              <AlertCircle size={40} className="mb-3" />
              <p className="font-medium">PDFを読み込めませんでした</p>
              <a href={pdfPath} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm text-blue-600 hover:underline">別タブで開く</a>
            </div>
          ) : (
            <iframe src={pdfPath} className="w-full h-full" style={{ minHeight: '70vh', border: 'none' }} onError={() => setPdfError(true)} title={typeLabel[fileType]} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function PDFPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const [ids, setIds] = useState<{ unitId: string; contentId: string } | null>(null);

  useEffect(() => {
    params.then(({ id, contentId }) => setIds({ unitId: id, contentId }));
  }, [params]);

  if (!ids) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">読み込み中...</div></div>;

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">読み込み中...</div></div>}>
      <PDFViewer unitId={ids.unitId} contentId={ids.contentId} />
    </Suspense>
  );
}
