'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const KaTeXRenderer = dynamic(() => import('@/components/KaTeXRenderer'), { ssr: false });

interface QuestionData {
  id: string;
  body: string;
  answer_mode: string;  // 'staged' | 'direct'
  show_feedback: boolean;
  allow_attachment: boolean;
  phase: string;
}

interface Props {
  questionId: string;
  onAnswered?: () => void;
}

const f = { fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' };

export default function QuestionCard({ questionId, onAnswered }: Props) {
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Staged answer fields
  const [understanding, setUnderstanding] = useState('');
  const [extraction, setExtraction] = useState('');
  const [equation, setEquation] = useState('');
  const [answer, setAnswer] = useState('');
  const [check, setCheck] = useState('');

  // Direct answer field
  const [directAnswer, setDirectAnswer] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ is_correct: boolean; message?: string } | null>(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    fetch(`/api/questions/${questionId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setQuestion(data); setLoading(false); })
      .catch(() => { setError('問題の取得に失敗しました'); setLoading(false); });
  }, [questionId]);

  const handleSubmit = async () => {
    if (!question) return;
    setSubmitting(true);
    const body = question.answer_mode === 'staged'
      ? { understanding, extraction, equation, answer, check }
      : { answer: directAnswer };

    const res = await fetch(`/api/questions/${questionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) { setError('送信に失敗しました'); return; }
    const data = await res.json();
    setResult(data);
    if (!answered) {
      setAnswered(true);
      onAnswered?.();
    }
  };

  if (loading) return (
    <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', fontSize: 13, color: '#9ca3af', ...f }}>
      問題を読み込み中...
    </div>
  );

  if (error || !question) return (
    <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 12, padding: '16px 20px', fontSize: 13, color: '#dc2626', ...f }}>
      {error || '問題が見つかりません'}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    minHeight: 60,
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };

  return (
    <div style={{ background: '#fff', border: '0.5px solid #fde68a', borderRadius: 12, overflow: 'hidden', ...f }}>
      {/* Header */}
      <div
        style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: '#fffbeb' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            ✏️
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>練習問題</div>
            {answered && (
              <div style={{ fontSize: 11, color: result?.is_correct ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                {result?.is_correct ? <><CheckCircle size={11} /> 正解！</> : <><XCircle size={11} /> 不正解</>}
              </div>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '20px 20px', borderTop: '0.5px solid #fde68a' }}>
          {/* Question body */}
          <div style={{ marginBottom: 20, padding: '14px 16px', background: '#fafafa', borderRadius: 8, border: '0.5px solid #e5e7eb' }}>
            <KaTeXRenderer content={question.body} />
          </div>

          {result ? (
            /* Result view */
            <div style={{ padding: '14px 16px', borderRadius: 8, background: result.is_correct ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${result.is_correct ? '#bbf7d0' : '#fecaca'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: result.is_correct ? '#15803d' : '#dc2626', fontSize: 14 }}>
                {result.is_correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {result.is_correct ? '正解です！' : '不正解です'}
              </div>
              {result.message && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>
                  <KaTeXRenderer content={result.message} />
                </div>
              )}
              <button
                onClick={() => { setResult(null); setAnswer(''); setDirectAnswer(''); setUnderstanding(''); setExtraction(''); setEquation(''); setCheck(''); }}
                style={{ marginTop: 12, fontSize: 12, color: '#6b7280', background: 'none', border: '0.5px solid #d1d5db', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                もう一度解く
              </button>
            </div>
          ) : question.answer_mode === 'staged' ? (
            /* Staged answer form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>① 問題の理解（何を求めるか）</label>
                <textarea value={understanding} onChange={e => setUnderstanding(e.target.value)} style={inputStyle} placeholder="例：xの値を求める" />
              </div>
              <div>
                <label style={labelStyle}>② 情報の整理（わかっていること）</label>
                <textarea value={extraction} onChange={e => setExtraction(e.target.value)} style={inputStyle} placeholder="例：a=2, b=3" />
              </div>
              <div>
                <label style={labelStyle}>③ 方程式・式の立式</label>
                <textarea value={equation} onChange={e => setEquation(e.target.value)} style={inputStyle} placeholder="例：2x + 3 = 7" />
              </div>
              <div>
                <label style={labelStyle}>④ 答え <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea value={answer} onChange={e => setAnswer(e.target.value)} style={inputStyle} placeholder="例：x = 2" />
              </div>
              <div>
                <label style={labelStyle}>⑤ 検算・確認</label>
                <textarea value={check} onChange={e => setCheck(e.target.value)} style={inputStyle} placeholder="例：2×2+3=7 ✓" />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !answer.trim()}
                style={{ padding: '9px 18px', background: '#0f1c2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: submitting || !answer.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !answer.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
                {submitting ? '送信中...' : '回答を送信'}
              </button>
            </div>
          ) : (
            /* Direct answer form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>答えを入力</label>
                <textarea value={directAnswer} onChange={e => setDirectAnswer(e.target.value)} style={inputStyle} placeholder="答えを入力してください" />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !directAnswer.trim()}
                style={{ padding: '9px 18px', background: '#0f1c2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: submitting || !directAnswer.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !directAnswer.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
                {submitting ? '送信中...' : '回答を送信'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}