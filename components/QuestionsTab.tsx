'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const KaTeXRenderer = dynamic(() => import('@/components/KaTeXRenderer'), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────
interface Content { id: string; title: string; unit_id?: string; }

interface Question {
  id: string;
  content_id: string;
  order: number;
  phase: string;
  body: string;
  answer_mode: string;
  accepted_answers: string[];
  allow_attachment: boolean;
  show_feedback: boolean;
  published: boolean;
  level: string | null;
  set_key: string | null;
  groups: string[];
}

interface QuestionsTabProps {
  contents: Content[];
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };
const btnPrimary: React.CSSProperties = { background: '#0f1c2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' };
const btnSecondary: React.CSSProperties = { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' };

const GROUP_COLORS: Record<string, string> = { A: '#dbeafe', B: '#dcfce7', C: '#fef3c7' };
const GROUP_TEXT: Record<string, string> = { A: '#1d4ed8', B: '#16a34a', C: '#92400e' };

// Latin square: for set index i (0-based), group X gets level L[(offset[X]+i)%3]
// A=0, B=1, C=2  offset: A→0, B→1, C→2
const LEVELS = ['基礎', '標準', '発展'];
function latinLevel(group: 'A' | 'B' | 'C', setIndex: number): string {
  const offset = { A: 0, B: 1, C: 2 }[group];
  return LEVELS[(offset + setIndex) % 3];
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', width: '100%', maxWidth: wide ? 760 : 540, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '0.5px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h3 style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{title}</h3>
          <button onClick={onClose} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Practice Question Form ───────────────────────────────────────────────────
function PracticeForm({ contentId, onSaved, onClose }: { contentId: string; onSaved: () => void; onClose: () => void }) {
  const [body, setBody] = useState('');
  const [answerMode, setAnswerMode] = useState<'staged' | 'simple'>('staged');
  const [acceptedAnswers, setAcceptedAnswers] = useState('');
  const [allowAttachment, setAllowAttachment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!body.trim()) { setError('問題文を入力してください'); return; }
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'practice',
        content_id: contentId,
        body: body.trim(),
        answer_mode: answerMode,
        accepted_answers: acceptedAnswers.split('\n').map(s => s.trim()).filter(Boolean),
        allow_attachment: allowAttachment,
        show_feedback: showFeedback,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || 'エラーが発生しました'); return; }
    onSaved();
    onClose();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>問題文（KaTeX使用可: $...$ / $$...$$）</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} placeholder="例: $x^2 + 2x + 1 = 0$ を解け。" />
        {body && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, fontSize: 13 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>プレビュー</div>
            <KaTeXRenderer content={body} />
          </div>
        )}
      </div>
      <div>
        <label style={labelStyle}>解答モード</label>
        <select value={answerMode} onChange={e => setAnswerMode(e.target.value as 'staged' | 'simple')} style={inputStyle}>
          <option value="staged">段階入力（理解度・抽出・立式・解答・確認）</option>
          <option value="simple">シンプル（解答のみ）</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>正解（1行1パターン、空白可）</label>
        <textarea value={acceptedAnswers} onChange={e => setAcceptedAnswers(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder={'x=-1\n-1'} />
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={allowAttachment} onChange={e => setAllowAttachment(e.target.checked)} /> 添付ファイル許可
        </label>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={showFeedback} onChange={e => setShowFeedback(e.target.checked)} /> 正誤フィードバック表示
        </label>
      </div>
      {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <button onClick={onClose} style={btnSecondary}>キャンセル</button>
        <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}

// ─── Test Set Form ────────────────────────────────────────────────────────────
function TestSetForm({ contentId, setIndex, phase, onSaved, onClose }: { contentId: string; setIndex: number; phase: 'pre' | 'post'; onSaved: () => void; onClose: () => void }) {
  const [bodies, setBodies] = useState<Record<string, string>>({ A: '', B: '', C: '' });
  const [acceptedAnswers, setAcceptedAnswers] = useState<Record<string, string>>({ A: '', B: '', C: '' });
  const [answerMode, setAnswerMode] = useState<'staged' | 'simple'>('staged');
  const [allowAttachment, setAllowAttachment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewGroup, setPreviewGroup] = useState<'A' | 'B' | 'C'>('A');

  async function handleSave() {
    for (const g of ['A', 'B', 'C'] as const) {
      if (!bodies[g].trim()) { setError(`グループ${g}の問題文を入力してください`); return; }
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test_set',
        content_id: contentId,
        phase,
        set_index: setIndex,
        questions: (['A', 'B', 'C'] as const).map(g => ({
          group: g,
          level: latinLevel(g, setIndex),
          body: bodies[g].trim(),
          accepted_answers: acceptedAnswers[g].split('\n').map((s: string) => s.trim()).filter(Boolean),
        })),
        answer_mode: answerMode,
        allow_attachment: allowAttachment,
        show_feedback: showFeedback,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || 'エラーが発生しました'); return; }
    onSaved();
    onClose();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Latin square preview */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>ラテン方格（セット{setIndex + 1}）</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['A', 'B', 'C'] as const).map(g => (
            <div key={g} style={{ flex: 1, background: GROUP_COLORS[g], borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: GROUP_TEXT[g] }}>グループ{g}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: GROUP_TEXT[g], marginTop: 2 }}>{latinLevel(g, setIndex)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs per group */}
      <div>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
          {(['A', 'B', 'C'] as const).map(g => (
            <button key={g} onClick={() => setPreviewGroup(g)} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', borderBottom: previewGroup === g ? '2px solid #0f1c2e' : '2px solid transparent', color: previewGroup === g ? '#0f1c2e' : '#6b7280', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
              グループ{g}（{latinLevel(g, setIndex)}）
            </button>
          ))}
        </div>
        <div>
          <label style={labelStyle}>問題文（KaTeX使用可）</label>
          <textarea value={bodies[previewGroup]} onChange={e => setBodies(p => ({ ...p, [previewGroup]: e.target.value }))} rows={5} style={{ ...inputStyle, resize: 'vertical' }} placeholder={`グループ${previewGroup}（${latinLevel(previewGroup, setIndex)}）向けの問題文`} />
          {bodies[previewGroup] && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, fontSize: 13 }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>プレビュー</div>
              <KaTeXRenderer content={bodies[previewGroup]} />
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>正解（1行1パターン）</label>
            <textarea value={acceptedAnswers[previewGroup]} onChange={e => setAcceptedAnswers(p => ({ ...p, [previewGroup]: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* Common settings */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={labelStyle}>解答モード</label>
          <select value={answerMode} onChange={e => setAnswerMode(e.target.value as 'staged' | 'simple')} style={inputStyle}>
            <option value="staged">段階入力</option>
            <option value="simple">シンプル</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', paddingBottom: 2 }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={allowAttachment} onChange={e => setAllowAttachment(e.target.checked)} /> 添付許可
          </label>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={showFeedback} onChange={e => setShowFeedback(e.target.checked)} /> フィードバック
          </label>
        </div>
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={btnSecondary}>キャンセル</button>
        <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? '保存中...' : '3問まとめて保存'}
        </button>
      </div>
    </div>
  );
}

// ─── Main QuestionsTab ────────────────────────────────────────────────────────
export default function QuestionsTab({ contents }: QuestionsTabProps) {
  const [selectedContentId, setSelectedContentId] = useState(contents[0]?.id ?? '');
  const [subTab, setSubTab] = useState<'list' | 'responses'>('list');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Modals
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState<{ phase: 'pre' | 'post'; setIndex: number } | null>(null);

  // Responses
  const [responses, setResponses] = useState<any[]>([]);
  const [respLoading, setRespLoading] = useState(false);
  const [respPhase, setRespPhase] = useState('');
  const [previewGroup, setPreviewGroup] = useState<'A' | 'B' | 'C' | ''>('');

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    if (!selectedContentId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/questions?contentId=${selectedContentId}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setLoading(false);
  }, [selectedContentId]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  async function handlePublish(phase: string, published: boolean) {
    setPublishing(true);
    await fetch('/api/admin/questions/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: selectedContentId, phase, published }),
    });
    await loadQuestions();
    setPublishing(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    await loadQuestions();
  }

  async function loadResponses() {
    setRespLoading(true);
    const params = new URLSearchParams({ contentId: selectedContentId });
    if (respPhase) params.set('phase', respPhase);
    const res = await fetch(`/api/admin/responses?${params}`);
    const data = await res.json();
    setResponses(data.responses ?? []);
    setRespLoading(false);
  }

  useEffect(() => {
    if (subTab === 'responses') loadResponses();
  }, [subTab, selectedContentId, respPhase]);

  async function exportResponses() {
    const params = new URLSearchParams({ contentId: selectedContentId });
    if (respPhase) params.set('phase', respPhase);
    const res = await fetch(`/api/admin/responses/export?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `responses_${selectedContentId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const practice = questions.filter(q => q.phase === 'practice').sort((a, b) => a.order - b.order);
  const pre = questions.filter(q => q.phase === 'pre').sort((a, b) => a.order - b.order);
  const post = questions.filter(q => q.phase === 'post').sort((a, b) => a.order - b.order);

  // Group test questions by set_key
  const groupBySet = (qs: Question[]) => {
    const map = new Map<string, Question[]>();
    for (const q of qs) {
      const k = q.set_key ?? q.id;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(q);
    }
    return Array.from(map.entries());
  };

  const previewQs = previewGroup
    ? questions.filter(q => q.groups.includes(previewGroup) || q.phase === 'practice')
    : [];

  return (
    <div>
      {/* Content selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ ...labelStyle, marginBottom: 0, marginRight: 8, display: 'inline' }}>コンテンツ：</label>
          <select value={selectedContentId} onChange={e => setSelectedContentId(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 240 }}>
            {contents.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 0, borderBottom: 'none', marginLeft: 'auto' }}>
          {(['list', 'responses'] as const).map(k => (
            <button key={k} onClick={() => setSubTab(k)} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: subTab === k ? '#0f1c2e' : '#f3f4f6', color: subTab === k ? '#fff' : '#6b7280', border: '1px solid #e5e7eb', borderRadius: k === 'list' ? '8px 0 0 8px' : '0 8px 8px 0', cursor: 'pointer', fontFamily: 'inherit' }}>
              {k === 'list' ? '問題一覧' : '回答一覧'}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST SUB-TAB ── */}
      {subTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* PRACTICE section */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>練習問題</h3>
                <PublishToggle published={practice.every(q => q.published) && practice.length > 0} loading={publishing} onToggle={p => handlePublish('practice', p)} />
              </div>
              <button onClick={() => setShowPracticeModal(true)} style={{ ...btnPrimary, fontSize: 12, padding: '6px 12px' }}>＋ 追加</button>
            </div>
            {loading ? <Spinner /> : practice.length === 0 ? (
              <EmptyState text="練習問題がありません" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {practice.map(q => (
                  <QuestionRow key={q.id} q={q} onDelete={() => setDeleteId(q.id)} onLoadQuestions={loadQuestions} />
                ))}
              </div>
            )}
          </section>

          {/* PRE section */}
          <TestSection
            label="事前テスト"
            phase="pre"
            groups={groupBySet(pre)}
            loading={loading}
            publishing={publishing}
            allPublished={pre.every(q => q.published) && pre.length > 0}
            onPublish={p => handlePublish('pre', p)}
            onAdd={setIndex => setShowTestModal({ phase: 'pre', setIndex })}
            onDelete={id => setDeleteId(id)}
            onLoadQuestions={loadQuestions}
          />

          {/* POST section */}
          <TestSection
            label="事後テスト"
            phase="post"
            groups={groupBySet(post)}
            loading={loading}
            publishing={publishing}
            allPublished={post.every(q => q.published) && post.length > 0}
            onPublish={p => handlePublish('post', p)}
            onAdd={setIndex => setShowTestModal({ phase: 'post', setIndex })}
            onDelete={id => setDeleteId(id)}
            onLoadQuestions={loadQuestions}
          />

          {/* Admin preview */}
          <section style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>管理者プレビュー</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['', 'A', 'B', 'C'] as const).map(g => (
                <button key={g} onClick={() => setPreviewGroup(g as any)} style={{ padding: '5px 14px', fontSize: 12, borderRadius: 20, border: '1px solid #e5e7eb', background: previewGroup === g ? '#0f1c2e' : '#f9fafb', color: previewGroup === g ? '#fff' : '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {g === '' ? '非選択' : `グループ${g}`}
                </button>
              ))}
            </div>
            {previewGroup && previewQs.length > 0 && (
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, fontSize: 13, color: '#374151' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>グループ {previewGroup} に表示される問題（{previewQs.length}件）</div>
                {previewQs.map(q => (
                  <div key={q.id} style={{ marginBottom: 10, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                      {q.phase === 'practice' ? '練習' : q.phase === 'pre' ? '事前' : '事後'}
                      {q.level && ` / ${q.level}`}
                    </div>
                    <KaTeXRenderer content={q.body} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── RESPONSES SUB-TAB ── */}
      {subTab === 'responses' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 0, display: 'inline', marginRight: 8 }}>フェーズ：</label>
              <select value={respPhase} onChange={e => setRespPhase(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                <option value="">すべて</option>
                <option value="practice">練習</option>
                <option value="pre">事前</option>
                <option value="post">事後</option>
              </select>
            </div>
            <button onClick={loadResponses} style={btnSecondary}>更新</button>
            <button onClick={exportResponses} style={{ ...btnPrimary, marginLeft: 'auto', fontSize: 12, padding: '6px 12px' }}>CSVエクスポート</button>
          </div>
          {respLoading ? <Spinner /> : (
            <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '0.5px solid #e5e7eb' }}>
                    {['ユーザー', 'グループ', 'フェーズ', 'レベル', '解答', '正誤', '提出日時'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map(r => (
                    <tr key={r.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.user?.username ?? r.user_id}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {r.group ? <span style={{ background: GROUP_COLORS[r.group] ?? '#f3f4f6', color: GROUP_TEXT[r.group] ?? '#374151', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>{r.group}</span> : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{r.question?.phase ?? '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{r.question?.level ?? '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{r.answer}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: r.is_correct ? '#dcfce7' : '#fee2e2', color: r.is_correct ? '#16a34a' : '#dc2626' }}>
                          {r.is_correct ? '正解' : '不正解'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{r.submitted_at ? new Date(r.submitted_at).toLocaleString('ja-JP') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {responses.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>回答がありません</div>}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showPracticeModal && (
        <Modal title="練習問題を追加" onClose={() => setShowPracticeModal(false)}>
          <PracticeForm contentId={selectedContentId} onSaved={loadQuestions} onClose={() => setShowPracticeModal(false)} />
        </Modal>
      )}
      {showTestModal && (
        <Modal title={`${showTestModal.phase === 'pre' ? '事前' : '事後'}テスト セット${showTestModal.setIndex + 1} を追加`} onClose={() => setShowTestModal(null)} wide>
          <TestSetForm contentId={selectedContentId} setIndex={showTestModal.setIndex} phase={showTestModal.phase} onSaved={loadQuestions} onClose={() => setShowTestModal(null)} />
        </Modal>
      )}
      {deleteId && (
        <Modal title="削除の確認" onClose={() => setDeleteId(null)}>
          <p style={{ fontSize: 14, color: '#374151', marginBottom: 20 }}>この問題を削除しますか？回答データも含めて削除されます。</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setDeleteId(null)} style={btnSecondary}>キャンセル</button>
            <button onClick={() => handleDelete(deleteId)} style={{ ...btnPrimary, background: '#dc2626' }}>削除</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Spinner() {
  return <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>読み込み中...</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 10 }}>{text}</div>;
}

function PublishToggle({ published, loading, onToggle }: { published: boolean; loading: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onToggle(!published)}
      disabled={loading}
      style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1, background: published ? '#dcfce7' : '#f3f4f6', color: published ? '#16a34a' : '#6b7280' }}
    >
      {published ? '公開中' : '未公開'}
    </button>
  );
}

function QuestionRow({ q, onDelete, onLoadQuestions }: { q: Question; onDelete: () => void; onLoadQuestions: () => void }) {
  const [toggling, setToggling] = useState(false);

  async function togglePublish() {
    setToggling(true);
    await fetch(`/api/admin/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !q.published }),
    });
    await onLoadQuestions();
    setToggling(false);
  }

  return (
    <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#111827', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <KaTeXRenderer content={q.body.slice(0, 100) + (q.body.length > 100 ? '…' : '')} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {q.level && <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '1px 8px', borderRadius: 99, fontWeight: 500 }}>{q.level}</span>}
          {q.groups.map(g => <span key={g} style={{ fontSize: 11, background: GROUP_COLORS[g] ?? '#f3f4f6', color: GROUP_TEXT[g] ?? '#374151', padding: '1px 8px', borderRadius: 99, fontWeight: 600 }}>G{g}</span>)}
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{q.answer_mode === 'staged' ? '段階入力' : 'シンプル'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={togglePublish} disabled={toggling} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: toggling ? 0.6 : 1, background: q.published ? '#dcfce7' : '#f3f4f6', color: q.published ? '#16a34a' : '#6b7280' }}>
          {q.published ? '公開中' : '未公開'}
        </button>
        <button onClick={onDelete} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>🗑</button>
      </div>
    </div>
  );
}

function TestSection({ label, phase, groups, loading, publishing, allPublished, onPublish, onAdd, onDelete, onLoadQuestions }: {
  label: string; phase: 'pre' | 'post';
  groups: [string, Question[]][];
  loading: boolean; publishing: boolean; allPublished: boolean;
  onPublish: (v: boolean) => void;
  onAdd: (setIndex: number) => void;
  onDelete: (id: string) => void;
  onLoadQuestions: () => void;
}) {
  const nextSetIndex = groups.length;

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{label}</h3>
          <PublishToggle published={allPublished} loading={publishing} onToggle={onPublish} />
        </div>
        <button onClick={() => onAdd(nextSetIndex)} style={{ ...btnPrimary, fontSize: 12, padding: '6px 12px' }}>＋ セット追加</button>
      </div>
      {loading ? <Spinner /> : groups.length === 0 ? (
        <EmptyState text={`${label}がありません`} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map(([setKey, qs], si) => (
            <div key={setKey} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>セット {si + 1}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {qs.sort((a, b) => (a.groups[0] ?? '').localeCompare(b.groups[0] ?? '')).map(q => (
                  <div key={q.id} style={{ flex: 1, background: GROUP_COLORS[q.groups[0]] ?? '#fff', border: `1px solid ${q.groups[0] ? '#e5e7eb' : '#e5e7eb'}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {q.groups[0] && <span style={{ fontSize: 11, fontWeight: 700, color: GROUP_TEXT[q.groups[0]] }}>G{q.groups[0]}</span>}
                        {q.level && <span style={{ fontSize: 11, color: '#6b7280' }}>{q.level}</span>}
                      </div>
                      <button onClick={() => onDelete(q.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>🗑</button>
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', maxHeight: 60 }}>
                      <KaTeXRenderer content={q.body.slice(0, 80) + (q.body.length > 80 ? '…' : '')} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}