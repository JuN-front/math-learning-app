'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { ChevronLeft, Play, FileText, Upload, CheckCircle, Lock, AlertCircle } from 'lucide-react';

interface ContentItem {
  id: string;
  type: string;  // 'video' | 'pdf' | 'link'
  label: string; // '学習用' | '課題用' | '解答用' | '参考資料'
  file_path?: string | null;
  url?: string | null;
  order: number;
}

interface Submission {
  id: string;
  item_id: string;
  file_path: string;
  filename: string;
  submitted_at: string;
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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => { params.then(({ id, contentId }) => { setUnitId(id); setContentId(contentId); }); }, [params]);
  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  const fetchData = async (cid: string) => {
    const [contentRes, progressRes] = await Promise.all([
      fetch(`/api/contents/${cid}`).then(r => r.json()),
      fetch(`/api/contents/${cid}/progress`).then(r => r.json()),
    ]);
    setContent(contentRes);
    setProgressStatus(progressRes.progress?.status ?? 'not_started');
    setSubmissions(progressRes.submissions ?? []);
    setLoading(false);
  };

  useEffect(() => { if (status === 'authenticated' && contentId) fetchData(contentId); }, [status, contentId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, item: ContentItem) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(item.id);
    setUploadError('');
    const form = new FormData();
    form.append('file', file);
    form.append('type', 'submission');
    form.append('itemId', item.id);
    form.append('contentId', contentId);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    setUploadLoading(null);
    if (!res.ok) setUploadError('アップロードに失敗しました。再度お試しください。');
    else fetchData(contentId);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('提出した課題を削除しますか？')) return;
    await fetch(`/api/upload?type=submission&itemId=${itemId}`, { method: 'DELETE' });
    fetchData(contentId);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ color: '#9ca3af', fontSize: 14 }}>読み込み中...</div>
    </div>
  );
  if (!content) return null;

  const isCompleted = progressStatus === 'completed';

  // itemsを種類別に整理
  const studyItems = content.items.filter(i => i.label === '学習用' || i.label === '参考資料');
  const assignmentItems = content.items.filter(i => i.label === '課題用');
  const answerItems = content.items.filter(i => i.label === '解答用');
  const hasSubmission = submissions.length > 0;

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

        {/* 学習コンテンツ */}
        {studyItems.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              学習コンテンツ <div style={{ flex: 1, height: '0.5px', background: '#e5e7eb' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {studyItems.map(item => {
                const isVideo = item.type === 'video';
                const href = isVideo
                  ? `/units/${unitId}/contents/${contentId}/video?itemId=${item.id}`
                  : `/units/${unitId}/contents/${contentId}/pdf?itemId=${item.id}`;
                return (
                  <div key={item.id} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: isVideo ? '#eff6ff' : '#faf5ff', color: isVideo ? '#2563eb' : '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isVideo ? <Play size={18} /> : <FileText size={18} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>
                        {item.label === '学習用' ? (isVideo ? '学習動画' : '学習テキスト') : item.label}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {item.file_path || item.url ? (
                        <Link href={href}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, background: '#0f1c2e', color: '#e8edf4', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                          {isVideo ? '動画を視聴 →' : 'テキストを閲覧 →'}
                        </Link>
                      ) : (
                        <span style={{ fontSize: 12, color: '#d1d5db' }}>未アップロード</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 課題提出 */}
        {assignmentItems.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              課題提出 <div style={{ flex: 1, height: '0.5px', background: '#e5e7eb' }} />
            </div>
            {assignmentItems.map(item => {
              const submission = submissions.find(s => s.item_id === item.id);
              return (
                <div key={item.id} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7ed', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Upload size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>課題ファイルの提出</div>
                      <div style={{ fontSize: 12, color: submission ? '#16a34a' : '#9ca3af' }}>
                        {submission ? '✓ 提出済み' : '未提出'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* 課題PDF */}
                    {item.file_path && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#faf5ff', border: '0.5px solid #e9d5ff', borderRadius: 8 }}>
                        <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={14} /> 課題テキストを確認
                        </span>
                        <Link href={`/units/${unitId}/contents/${contentId}/pdf?itemId=${item.id}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, background: '#f3f4f6', color: '#374151', fontSize: 12, fontWeight: 500, textDecoration: 'none', border: '0.5px solid #e5e7eb' }}>
                          開く →
                        </Link>
                      </div>
                    )}

                    {/* 提出済みファイル */}
                    {submission && (
                      <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
                            📎 {submission.filename}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                            {new Date(submission.submitted_at).toLocaleString('ja-JP')} 提出
                          </div>
                        </div>
                        <button onClick={() => handleDelete(item.id)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: '0.5px solid #fecaca', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          削除
                        </button>
                      </div>
                    )}

                    {uploadError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
                        <AlertCircle size={13} /> {uploadError}
                      </div>
                    )}

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: '#f3f4f6', color: uploadLoading === item.id ? '#9ca3af' : '#374151', border: '0.5px solid #e5e7eb', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                      <Upload size={14} />
                      {uploadLoading === item.id ? 'アップロード中...' : submission ? '再提出する' : 'ファイルを選択して提出'}
                      <input type="file" style={{ display: 'none' }} onChange={e => handleUpload(e, item)} disabled={uploadLoading === item.id} />
                    </label>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* 解答（提出後に表示） */}
        {answerItems.length > 0 && hasSubmission && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              解答 <div style={{ flex: 1, height: '0.5px', background: '#e5e7eb' }} />
            </div>
            {answerItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> 解答を確認する
                </span>
                {item.file_path && (
                  <Link href={`/units/${unitId}/contents/${contentId}/pdf?itemId=${item.id}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, background: '#f3f4f6', color: '#374151', fontSize: 12, fontWeight: 500, textDecoration: 'none', border: '0.5px solid #e5e7eb' }}>
                    開く →
                  </Link>
                )}
              </div>
            ))}
          </>
        )}

        <Link href={`/units/${unitId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#378ADD', textDecoration: 'none', marginTop: 8 }}>
          <ChevronLeft size={14} /> 単元ページに戻る
        </Link>
      </div>
    </div>
  );
}