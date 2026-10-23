'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const KaTeXRenderer = dynamic(() => import('@/components/KaTeXRenderer'), { ssr: false });

interface SubQuestionData {
  id: string;
  order: number;
  body: string;
  file_path: string | null;
}

interface QuestionData {
  id: string;
  body: string;
  file_path: string | null;
  answer_mode: string;
  has_sub_questions: boolean;
  show_feedback: boolean;
  allow_attachment: boolean;
  phase: string;
  sub_questions: SubQuestionData[];
}

interface AnswerState {
  understanding: string;
  extraction: string;
  equation: string;
  answer: string;
  check: string;
}

interface SubResult {
  is_correct: boolean;
  message?: string;
}

const emptyAnswer = (): AnswerState => ({
  understanding: '', extraction: '', equation: '', answer: '', check: '',
});

interface Props {
  questionId: string;
  onAnswered?: () => void;
}

const f = { fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', resize: 'vertical' as const, minHeight: 60,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4,
};

function AnswerForm({
  mode, state, onChange, onSubmit, submitting,
}: {
  mode: string;
  state: AnswerState;
  onChange: (field: keyof AnswerState, value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const canSubmit = state.answer.trim().length > 0 && !submitting;
  if (mode === 'staged') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>① 問題の理解（何を求めるか）</label>
          <textarea value={state.understanding} onChange={e => onChange('understanding', e.target.value)} style={inputStyle} placeholder="例：xの値を求める" />
        </div>
        <div>
          <label style={labelStyle}>② 情報の整理（わかっていること）</label>
          <textarea value={state.extraction} onChange={e => onChange('extraction', e.target.value)} style={inputStyle} placeholder="例：a=2, b=3" />
        </div>
        <div>
          <label style={labelStyle}>③ 方程式・式の立式</label>
          <textarea value={state.equation} onChange={e => onChange('equation', e.target.value)} style={inputStyle} placeholder="例：2x + 3 = 7" />
        </div>
        <div>
          <label style={labelStyle}>④ 答え <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea value={state.answer} onChange={e => onChange('answer', e.target.value)} style={inputStyle} placeholder="例：x = 2" />
        </div>
        <div>
          <label style={labelStyle}>⑤ 検算・確認</label>
          <textarea value={state.check} onChange={e => onChange('check', e.target.value)} style={inputStyle} placeholder="例：2×2+3=7 ✓" />
        </div>
        <button onClick={onSubmit} disabled={!canSubmit}
          style={{ padding: '9px 18px', background: '#0f1c2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.6, fontFamily: 'inherit' }}>
          {submitting ? '送信中...' : '回答を送信'}
        </button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>答えを入力 <span style={{ color: '#ef4444' }}>*</span></label>
        <textarea value={state.answer} onChange={e => onChange('answer', e.target.value)} style={inputStyle} placeholder="答えを入力してください" />
      </div>
      <button onClick={onSubmit} disabled={!canSubmit}
        style={{ padding: '9px 18px', background: '#0f1c2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.6, fontFamily: 'inherit' }}>
        {submitting ? '送信中...' : '回答を送信'}
      </button>
    </div>
  );
}

function SubQuestionBlock({
  sub, index, mode, questionId, show_feedback, onFirstAnswer,
}: {
  sub: SubQuestionData;
  index: number;
  mode: string;
  questionId: string;
  show_feedback: boolean;
  onFirstAnswer: () => void;
}) {
  const [state, setState] = useState<AnswerState>(emptyAnswer());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubResult | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleChange = (field: keyof AnswerState, value: string) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/questions/${questionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_question_id: sub.id, ...state }),
    });
    setSubmitting(false);
    if (!res.ok) return;
    const data = await res.json();
    setResult(data);
    if (!answered) { setAnswered(true); onFirstAnswer(); }
  };

  const reset = () => { setResult(null); setState(emptyAnswer()); };

  return (
    <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ background: '#f9fafb', padding: '10px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>({index + 1})</span>
        {answered && result && (
          <span style={{ fontSize: 11, color: result.is_correct ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 3 }}>
            {result.is_correct ? <><CheckCircle size={11} /> 正解</> : <><XCircle size={11} /> 不正解</>}
          </span>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fafafa', borderRadius: 8, border: '0.5px solid #e5e7eb', fontSize: 13 }}>
          <KaTeXRenderer content={sub.body} />
        </div>
        {sub.file_path && (
          <img src={sub.file_path} alt="問題画像" style={{ maxWidth: '100%', borderRadius: 6, marginBottom: 12 }} />
        )}
        {result ? (
          <div style={{ padding: '12px 14px', borderRadius: 8, background: result.is_correct ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${result.is_correct ? '#bbf7d0' : '#fecaca'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: result.is_correct ? '#15803d' : '#dc2626', fontSize: 13 }}>
              {result.is_correct ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {result.is_correct ? '正解です！' : '不正解です'}
            </div>
            {result.message && <div style={{ marginTop: 6, fontSize: 13, color: '#374151' }}><KaTeXRenderer content={result.message} /></div>}
            <button onClick={reset} style={{ marginTop: 10, fontSize: 12, color: '#6b7280', background: 'none', border: '0.5px solid #d1d5db', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              もう一度解く
            </button>
          </div>
        ) : (
          <AnswerForm mode={mode} state={state} onChange={handleChange} onSubmit={handleSubmit} submitting={submitting} />
        )}
      </div>
    </div>
  );
}

export default function QuestionCard({ questionId, onAnswered }: Props) {
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const [state, setState] = useState<AnswerState>(emptyAnswer());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ is_correct: boolean; message?: string } | null>(null);
  const [answered, setAnswered] = useState(false);

  const [answeredSubCount, setAnsweredSubCount] = useState(0);
  const answeredSubCountRef = { current: answeredSubCount };

  useEffect(() => {
    fetch(`/api/questions/${questionId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setQuestion(data); setLoading(false); })
      .catch(() => { setError('問題の取得に失敗しました'); setLoading(false); });
  }, [questionId]);

  const handleMainSubmit = async () => {
    if (!question) return;
    setSubmitting(true);
    const res = await fetch(`/api/questions/${questionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    setSubmitting(false);
    if (!res.ok) { setError('送信に失敗しました'); return; }
    const data = await res.json();
    setResult(data);
    if (!answered) { setAnswered(true); onAnswered?.(); }
  };

  const handleSubFirstAnswer = () => {
    const newCount = answeredSubCountRef.current + 1;
    setAnsweredSubCount(newCount);
    if (newCount === 1) onAnswered?.();
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

  const hasSubQ = question.has_sub_questions && question.sub_questions.length > 0;

  return (
    <div style={{ background: '#fff', border: '0.5px solid #fde68a', borderRadius: 12, overflow: 'hidden', ...f }}>
      <div
        style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: '#fffbeb' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            ✏️
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              練習問題{hasSubQ ? `（小問 ${question.sub_questions.length} 問）` : ''}
            </div>
            {answered && !hasSubQ && (
              <div style={{ fontSize: 11, color: result?.is_correct ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                {result?.is_correct ? <><CheckCircle size={11} /> 正解！</> : <><XCircle size={11} /> 不正解</>}
              </div>
            )}
            {hasSubQ && answeredSubCount > 0 && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {answeredSubCount} / {question.sub_questions.length} 問回答済み
              </div>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </div>

      {expanded && (
        <div style={{ padding: '20px', borderTop: '0.5px solid #fde68a' }}>
          <div style={{ marginBottom: 16, padding: '14px 16px', background: '#fafafa', borderRadius: 8, border: '0.5px solid #e5e7eb' }}>
            <KaTeXRenderer content={question.body} />
          </div>
          {question.file_path && (
            <img src={question.file_path} alt="問題画像" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 16 }} />
          )}

          {hasSubQ ? (
            <div>
              {question.sub_questions.map((sub, i) => (
                <SubQuestionBlock
                  key={sub.id}
                  sub={sub}
                  index={i}
                  mode={question.answer_mode}
                  questionId={questionId}
                  show_feedback={question.show_feedback}
                  onFirstAnswer={handleSubFirstAnswer}
                />
              ))}
            </div>
          ) : result ? (
            <div style={{ padding: '14px 16px', borderRadius: 8, background: result.is_correct ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${result.is_correct ? '#bbf7d0' : '#fecaca'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: result.is_correct ? '#15803d' : '#dc2626', fontSize: 14 }}>
                {result.is_correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {result.is_correct ? '正解です！' : '不正解です'}
              </div>
              {result.message && <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}><KaTeXRenderer content={result.message} /></div>}
              <button
                onClick={() => { setResult(null); setState(emptyAnswer()); }}
                style={{ marginTop: 12, fontSize: 12, color: '#6b7280', background: 'none', border: '0.5px solid #d1d5db', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                もう一度解く
              </button>
            </div>
          ) : (
            <AnswerForm
              mode={question.answer_mode}
              state={state}
              onChange={(field, value) => setState(prev => ({ ...prev, [field]: value }))}
              onSubmit={handleMainSubmit}
              submitting={submitting}
            />
          )}
        </div>
      )}
    </div>
  );
}