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

const f = { fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' };

export default function ContentPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const { status } = useSession();
  const router = useRouter();
  const [unitId, setUnitId] = useState('');
  const [contentId, setContentId] = useState('');
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => { params.then(({ id, contentId }) => { setUnitId(id); setContentId(contentId); }); }, [params]);
  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

  const fetchContent = () => {
    if (!contentId) return;
    fetch(`/api/contents/${contentId}`).then(r => r.json()).then(data => { setContent(data); setLoading(false); });
  };

  useEffect(() => { if (status === 'authenticated' && contentId) fetchContent(); }, [status, contentId]);

  const markProgress = async (field: string) => {
    await fetch(`/api/contents/${contentId}/progress`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
      <div style={{ color: '#9ca3af', fontSize: 14 }}>読み込み中...</div>
    </div>
  );
  if (!content) return null;

  if (content.is_locked) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fa', ...f }}>
        <Header />
        <div style={{ maxWidth: 760, margin: '60px auto', padding: '0 28px', textAlign: 'center' }}>
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 16, padding: 48 }}>
            <Lock size={40} style={{ color: '#fbbf24', marginBottom: 16 }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>このコンテンツはロックされています</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>前のコンテンツを完了してからアクセスできます</p>
            <Link href={`/units/${unitId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 18px', borderRadius: 8, background: '#0f1c2e', color: '#e8edf4', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              <ChevronLeft size={14} /> 単元ページに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const prog = content.progress;
  const isCompleted = prog?.status === 'completed';

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
        {(content.has_video || content.has_textbook) && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              学習コンテンツ <div style={{ flex: 1, height: '0.5px', background: '#e5e7eb' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>

              {content.has_video && (
                <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Play size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>学習動画</div>
                    <div style={{ fontSize: 12, color: prog?.video_watched ? '#16a34a' : '#9ca3af' }}>
                      {prog?.video_watched ? '✓ 視聴済み' : '未視聴'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {prog?.video_watched && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={12} />
                      </div>
                    )}
                    {content.video_path ? (
                      <Link href={`/units/${unitId}/contents/${contentId}/video`} onClick={() => markProgress('video_watched')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, background: prog?.video_watched ? '#f3f4f6' : '#0f1c2e', color: prog?.video_watched ? '#374151' : '#e8edf4', fontSize: 13, fontWeight: 500, textDecoration: 'none', border: prog?.video_watched ? '0.5px solid #e5e7eb' : 'none' }}>
                        {prog?.video_watched ? '見直す →' : '動画を視聴 →'}
                      </Link>
                    ) : (
                      <span style={{ fontSize: 12, color: '#d1d5db' }}>未アップロード</span>
                    )}
                  </div>
                </div>
              )}

              {content.has_textbook && (
                <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>学習テキスト</div>
                    <div style={{ fontSize: 12, color: prog?.textbook_read ? '#16a34a' : '#9ca3af' }}>
                      {prog?.textbook_read ? '✓ 閲覧済み' : '未閲覧'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {prog?.textbook_read && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={12} />
                      </div>
                    )}
                    {content.textbook_path ? (
                      <Link href={`/units/${unitId}/contents/${contentId}/pdf?type=textbook`} onClick={() => markProgress('textbook_read')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, background: prog?.textbook_read ? '#f3f4f6' : '#0f1c2e', color: prog?.textbook_read ? '#374151' : '#e8edf4', fontSize: 13, fontWeight: 500, textDecoration: 'none', border: prog?.textbook_read ? '0.5px solid #e5e7eb' : 'none' }}>
                        {prog?.textbook_read ? '見直す →' : 'テキストを閲覧 →'}
                      </Link>
                    ) : (
                      <span style={{ fontSize: 12, color: '#d1d5db' }}>未アップロード</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 課題提出 */}
        {content.has_assignment && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              課題提出 <div style={{ flex: 1, height: '0.5px', background: '#e5e7eb' }} />
            </div>
            <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: content.assignment_path || content.assignment ? 16 : 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7ed', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Upload size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>課題ファイルの提出</div>
                  <div style={{ fontSize: 12, color: prog?.assignment_submitted ? '#16a34a' : '#9ca3af' }}>
                    {prog?.assignment_submitted ? '✓ 提出済み' : '未提出'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 課題PDF */}
                {content.assignment_path && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#faf5ff', border: '0.5px solid #e9d5ff', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={14} /> 課題テキストを確認
                    </span>
                    <Link href={`/units/${unitId}/contents/${contentId}/pdf?type=assignment`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, background: '#f3f4f6', color: '#374151', fontSize: 12, fontWeight: 500, textDecoration: 'none', border: '0.5px solid #e5e7eb' }}>
                      開く →
                    </Link>
                  </div>
                )}

                {/* 提出済みファイル */}
                {content.assignment && (
                  <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📎 {content.assignment.filename}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        {new Date(content.assignment.submitted_at).toLocaleString('ja-JP')} 提出
                      </div>
                    </div>
                    <button onClick={handleDeleteAssignment} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: '0.5px solid #fecaca', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      削除
                    </button>
                  </div>
                )}

                {/* エラー */}
                {uploadError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
                    <AlertCircle size={13} /> {uploadError}
                  </div>
                )}

                {/* アップロードボタン */}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: '#f3f4f6', color: uploadLoading ? '#9ca3af' : '#374151', border: '0.5px solid #e5e7eb', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  <Upload size={14} />
                  {uploadLoading ? 'アップロード中...' : content.assignment ? '再提出する' : 'ファイルを選択して提出'}
                  <input type="file" style={{ display: 'none' }} onChange={handleAssignmentUpload} disabled={uploadLoading} />
                </label>

                {/* 解答（提出後に表示） */}
                {content.answer_path && prog?.assignment_submitted && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={14} /> 解答を確認する
                    </span>
                    <Link href={`/units/${unitId}/contents/${contentId}/pdf?type=answer`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, background: '#f3f4f6', color: '#374151', fontSize: 12, fontWeight: 500, textDecoration: 'none', border: '0.5px solid #e5e7eb' }}>
                      開く →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Link href={`/units/${unitId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#378ADD', textDecoration: 'none', marginTop: 8 }}>
          <ChevronLeft size={14} /> 単元ページに戻る
        </Link>
      </div>
    </div>
  );
}
