'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronLeft, AlertCircle, FileText } from 'lucide-react';
import { logEvent, startLogger, stopLogger } from '@/lib/logger';

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

const labelToTitle: Record<string, string> = {
  '学習用': '学習テキスト',
  '課題用': '課題',
  '解答用': '解答',
  '参考資料': '参考資料',
};

function PDFViewer({ unitId, contentId }: { unitId: string; contentId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('itemId');

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [pdfItem, setPdfItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const openedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !contentId) return;

    startLogger();
    openedAtRef.current = Date.now();

    fetch(`/api/contents/${contentId}`)
      .then(r => r.json())
      .then((data: ContentDetail) => {
        setContent(data);
        // itemId指定があればそのitem、なければ最初のpdfアイテム
        const item = itemId
          ? data.items.find(i => i.id === itemId)
          : data.items.find(i => i.type === 'pdf');
        setPdfItem(item ?? null);
        setLoading(false);

        if (item) {
          logEvent('pdf_open', {
            contentId,
            itemId: item.id,
            payload: { label: item.label },
          });
        }
      });

    return () => {
      const duration = Math.round((Date.now() - openedAtRef.current) / 1000);
      logEvent('pdf_close', {
        contentId,
        itemId: pdfItem?.id,
        payload: { duration_sec: duration },
      });
      stopLogger();
    };
  }, [status, contentId, itemId]);

  // 課題用PDFを開いた時のログ
  useEffect(() => {
    if (pdfItem?.label === '課題用') {
      logEvent('assignment_open', { contentId, itemId: pdfItem.id });
    }
  }, [pdfItem, contentId]);

  const f = { fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ color: '#9ca3af', fontSize: 14 }}>読み込み中...</div>
    </div>
  );

  const pdfPath = pdfItem?.file_path ?? pdfItem?.url ?? null;
  const title = labelToTitle[pdfItem?.label ?? ''] ?? 'PDF';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa', ...f }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 1100, width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
          <Link href={`/units/${unitId}/contents/${contentId}`} style={{ color: '#378ADD', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> コンテンツに戻る
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <FileText size={20} style={{ color: '#7c3aed' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
            {content?.title} — {title}
          </h1>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', overflow: 'hidden', minHeight: '70vh' }}>
          {!pdfPath ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, color: '#9ca3af' }}>
              <AlertCircle size={40} style={{ marginBottom: 12, color: '#fca5a5' }} />
              <p style={{ fontWeight: 500 }}>PDFがまだアップロードされていません</p>
            </div>
          ) : pdfError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, color: '#f87171' }}>
              <AlertCircle size={40} style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 500 }}>PDFを読み込めませんでした</p>
              <a href={pdfPath} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12, fontSize: 13, color: '#378ADD' }}>別タブで開く</a>
            </div>
          ) : (
            <iframe
              src={pdfPath}
              style={{ width: '100%', height: '100%', minHeight: '70vh', border: 'none', display: 'block' }}
              onError={() => setPdfError(true)}
              title={title}
            />
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

  if (!ids) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ color: '#9ca3af', fontSize: 14 }}>読み込み中...</div>
    </div>
  );

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#9ca3af' }}>読み込み中...</div></div>}>
      <PDFViewer unitId={ids.unitId} contentId={ids.contentId} />
    </Suspense>
  );
}