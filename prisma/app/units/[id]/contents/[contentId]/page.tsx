'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronLeft, Play, FileText, Upload, CheckCircle, Lock, AlertCircle } from 'lucide-react';

interface ContentDetail {
  id: string; unit_id: string; title: string; description: string;
  has_video: boolean; has_textbook: boolean; has_assignment: boolean;
  video_path: string | null; textbook_path: string | null;
  assignment_path: string | null; answer_path: string | null;
  lock_conditions: string[]; is_locked: boolean;
  progress: { status: string; video_watched: boolean; textbook_read: boolean; assignment_submitted: boolean; } | null;
  assignment: { id: string; file_path: string; filename: string; submitted_at: string; } | null;
}

export default function ContentPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const { status } = useSession();
  const router = useRouter();
  const [unitId, setUnitId] = useState('');
  const [contentId, setContentId] = useState('');
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    params.then(({ id, contentId }) => { setUnitId(id); setContentId(contentId); });
  }, [params]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchContent = () => {
    if (!contentId) return;
    fetch(`/api/contents/${contentId}`).then(r => r.json()).then(data => { setContent(data); setLoading(false); });
  };

  useEffect(() => {
    if (status === 'authenticated' && contentId) fetchContent();
  }, [status, contentId]);

  const markProgress = async (field: string) => {
    await fetch(`/api/contents/${contentId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: true }),
    });
    fetchContent();
  };

  const handleAssignmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true); setUploadError('');
    const form = new FormData();
    form.append('file', file); form.append('content_id', contentId);
    const res = await fetch('/api/assignments', { method: 'POST', body: form });
    setUploadLoading(false);
    if (!res.ok) setUploadError('アップロードに失敗しました。再度お試しください。');
    else fetchContent();
  };

  const handleDeleteAssignment = async () => {
    if (!confirm('提出した課題を削除しますか？')) return;
    await fetch(`/api/assignments?content_id=${contentId}`, { method: 'DELETE' });
    fetchContent();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">読み込み中...</div></div>;
  if (!content) return null;

  if (content.is_locked) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-8 text-center">
          <div className="card p-12 mt-8">
            <Lock size={48} className="mx-auto mb-4 text-amber-400" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">このコンテンツはロックされています</h2>
            <p className="text-gray-500 mb-6">前のコンテンツを完了してからアクセスできます</p>
            <Link href={`/units/${unitId}`} className="btn-primary inline-flex items-center gap-2">
              <ChevronLeft size={16} /> 単元ページに戻る
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const prog = content.progress;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
          <Link href="/dashboard" className="hover:text-blue-600">トップ</Link>
          <span>/</span>
          <Link href={`/units/${unitId}`} className="hover:text-blue-600 flex items-center gap-1"><ChevronLeft size={14} />単元</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">{content.title}</span>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{content.title}</h1>
              <p className="text-gray-500 text-sm">{content.description}</p>
            </div>
            {prog?.status === 'completed' && (
              <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold shrink-0">
                <CheckCircle size={18} /> 完了
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {content.has_video && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-lg p-2.5"><Play size={20} className="text-blue-600" /></div>
                  <div>
                    <div className="font-semibold text-gray-900">学習動画</div>
                    <div className="text-sm text-gray-500">{prog?.video_watched ? '視聴済み ✓' : '未視聴'}</div>
                  </div>
                </div>
                {content.video_path ? (
                  <Link href={`/units/${unitId}/contents/${contentId}/video`} onClick={() => markProgress('video_watched')} className="btn-primary text-sm flex items-center gap-2">
                    <Play size={14} /> 動画を視聴
                  </Link>
                ) : <span className="text-sm text-gray-400">動画未アップロード</span>}
              </div>
            </div>
          )}

          {content.has_textbook && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 rounded-lg p-2.5"><FileText size={20} className="text-purple-600" /></div>
                  <div>
                    <div className="font-semibold text-gray-900">学習テキスト</div>
                    <div className="text-sm text-gray-500">{prog?.textbook_read ? '閲覧済み ✓' : '未閲覧'}</div>
                  </div>
                </div>
                {content.textbook_path ? (
                  <Link href={`/units/${unitId}/contents/${contentId}/pdf?type=textbook`} onClick={() => markProgress('textbook_read')} className="btn-primary text-sm flex items-center gap-2">
                    <FileText size={14} /> テキストを閲覧
                  </Link>
                ) : <span className="text-sm text-gray-400">テキスト未アップロード</span>}
              </div>
            </div>
          )}

          {content.has_assignment && (
            <div className="card p-5">
              <div className="flex items-start gap-3">
                <div className="bg-orange-100 rounded-lg p-2.5 shrink-0"><Upload size={20} className="text-orange-600" /></div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">課題提出</div>
                  {content.assignment_path && (
                    <div className="mb-3">
                      <Link href={`/units/${unitId}/contents/${contentId}/pdf?type=assignment`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <FileText size={14} /> 課題用テキストを確認
                      </Link>
                    </div>
                  )}
                  {content.assignment && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-green-700">提出済み</div>
                          <div className="text-xs text-green-600">{content.assignment.filename}</div>
                          <div className="text-xs text-gray-400">{new Date(content.assignment.submitted_at).toLocaleString('ja-JP')}</div>
                        </div>
                        <button onClick={handleDeleteAssignment} className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded">削除</button>
                      </div>
                    </div>
                  )}
                  {uploadError && <div className="flex items-center gap-2 text-red-600 text-sm mb-2"><AlertCircle size={14} />{uploadError}</div>}
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition">
                    <Upload size={14} />
                    {content.assignment ? '再提出する' : 'ファイルを選択してアップロード'}
                    <input type="file" className="hidden" onChange={handleAssignmentUpload} disabled={uploadLoading} />
                  </label>
                  {uploadLoading && <span className="text-sm text-gray-400 ml-2">アップロード中...</span>}
                  {content.answer_path && prog?.assignment_submitted && (
                    <div className="mt-3">
                      <Link href={`/units/${unitId}/contents/${contentId}/pdf?type=answer`} className="text-sm text-green-600 hover:underline flex items-center gap-1">
                        <FileText size={14} /> 解答を確認
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link href={`/units/${unitId}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <ChevronLeft size={14} /> 単元ページに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
