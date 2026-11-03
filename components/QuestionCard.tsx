'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

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

interface ExplanationData {
  exp_understanding: string | null;
  exp_extraction: string | null;
  exp_equation: string | null;
  exp_answer: string | null;
  exp_check: string | null;
}

interface AnswerResult {
  is_correct: boolean;
  message?: string;
  explanation?: ExplanationData;
  explanation_unlocked?: boolean;
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

// ─── ログ送信ユーティリティ ────────────────────────────────────────────────────
function sendLog(event: string, payload: Record<string, unknown>, contentId?: string) {
  const body = JSON.stringify({
    events: [{
      event,
      contentId,
      payload,
      client_time: new Date().toISOString(),
    }],
  });
  // sendBeacon が使えればそちらを優先（ページ離脱時も確実に送れる）
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/logs', new Blob([body], { type: 'application/json' }));
  } else {
    fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  }
}

// ─── フォーカス離脱フック ──────────────────────────────────────────────────────
function useFocusTracking(questionId: string, isActive: boolean) {
  const blurCountRef = useRef(0);
  const blurStartRef = useRef<number | null>(null);
  const totalBlurMsRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    const handleBlur = () => {
      blurStartRef.current = Date.now();
      blurCountRef.current += 1;
      sendLog('focus_blur', {
        question_id: questionId,
        blur_count: blurCountRef.current,
      });
    };

    const handleFocus = () => {
      if (blurStartRef.current !== null) {
        const duration_ms = Date.now() - blurStartRef.current;
        totalBlurMsRef.current += duration_ms;
        blurStartRef.current = null;
        sendLog('focus_return', {
          question_id: questionId,
          duration_ms,
          total_blur_ms: totalBlurMsRef.current,
          blur_count: blurCountRef.current,
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [questionId, isActive]);

  return { blurCountRef, totalBlurMsRef };
}

// ─── Explanation panel ────────────────────────────────────────────────────────
function ExplanationPanel({ exp, mode }: { exp: ExplanationData; mode: string }) {
  const stages = mode === 'staged' ? [
    { key: 'exp_understanding' as const, label: '① 問題の理解' },
    { key: 'exp_extraction' as const, label: '② 情報の整理' },
    { key: 'exp_equation' as const, label: '③ 立式' },
    { key: 'exp_answer' as const, label: '④ 答え' },
    { key: 'exp_check' as const, label: '⑤ 検算' },
  ] : [
    { key: 'exp_answer' as const, label: '答え' },
  ];

  const filledStages = stages.filter(s => exp[s.key]);
  if (filledStages.length === 0) return null;

  return (
    <div style={{ marginTop: 14, padding: '14px 16px', background: '#f0f9ff', border: '0.5px solid #bae6fd', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0369a1', fontSize: 13, marginBottom: 12 }}>
        <BookOpen size={14} />
        解説・記入例
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filledStages.map(({ key, label }) => (
          <div key={key} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '0.5px solid #e0f2fe' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, color: '#1e293b' }}>
              <KaTeXRenderer content={exp[key]!} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Unlock explanation button ────────────────────────────────────────────────
function UnlockExplanationButton({ questionId, subQuestionId, mode, onUnlocked }: {
  questionId: string;
  subQuestionId?: string;
  mode: string;
  onUnlocked: (exp: ExplanationData) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    await fetch(`/api/questions/${questionId}/explanation-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subQuestionId ? { sub_question_id: subQuestionId } : {}),
    });
    const res = await fetch(`/api/questions/${questionId}/explanation?${subQuestionId ? `sub_question_id=${subQuestionId}` : ''}`, {
      method: 'GET',
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      onUnlocked(data.explanation);
    }
  };

  return (
    <button
      onClick={handleUnlock}
      disabled={loading}
      style={{
        marginTop: 12, padding: '8px 16px', fontSize: 13, fontWeight: 500,
        background: '#fff', color: '#0369a1', border: '1px solid #bae6fd',
        borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1,
      }}
    >
      <BookOpen size={14} />
      {loading ? '読み込み中...' : '解説を見る（3回不正解のため閲覧可）'}
    </button>
  );
}

// ─── Single answer form (staged or direct) ────────────────────────────────────
function AnswerForm({
  mode, state, onChange, onSubmit, submitting, questionId, subQuestionId,
}: {
  mode: string;
  state: AnswerState;
  onChange: (field: keyof AnswerState, value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  questionId: string;
  subQuestionId?: string;
}) {
  const canSubmit = state.answer.trim().length > 0 && !submitting;

  // コピペ検知
  const handlePaste = useCallback((field: keyof AnswerState, e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text');
    sendLog('paste_detected', {
      question_id: questionId,
      sub_question_id: subQuestionId ?? null,
      field,
      pasted_length: pasted.length,
    });
  }, [questionId, subQuestionId]);

  if (mode === 'staged') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>① 問題の理解（何を求めるか）</label>
          <textarea value={state.understanding} onChange={e => onChange('understanding', e.target.value)} onPaste={e => handlePaste('understanding', e)} style={inputStyle} placeholder="例：xの値を求める" />
        </div>
        <div>
          <label style={labelStyle}>② 情報の整理（わかっていること）</label>
          <textarea value={state.extraction} onChange={e => onChange('extraction', e.target.value)} onPaste={e => handlePaste('extraction', e)} style={inputStyle} placeholder="例：a=2, b=3" />
        </div>
        <div>
          <label style={labelStyle}>③ 方程式・式の立式</label>
          <textarea value={state.equation} onChange={e => onChange('equation', e.target.value)} onPaste={e => handlePaste('equation', e)} style={inputStyle} placeholder="例：2x + 3 = 7" />
        </div>
        <div>
          <label style={labelStyle}>④ 答え <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea value={state.answer} onChange={e => onChange('answer', e.target.value)} onPaste={e => handlePaste('answer', e)} style={inputStyle} placeholder="例：x = 2" />
        </div>
        <div>
          <label style={labelStyle}>⑤ 検算・確認</label>
          <textarea value={state.check} onChange={e => onChange('check', e.target.value)} onPaste={e => handlePaste('check', e)} style={inputStyle} placeholder="例：2×2+3=7 ✓" />
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
        <textarea value={state.answer} onChange={e => onChange('answer', e.target.value)} onPaste={e => handlePaste('answer', e)} style={inputStyle} placeholder="答えを入力してください" />
      </div>
      <button onClick={onSubmit} disabled={!canSubmit}
        style={{ padding: '9px 18px', background: '#0f1c2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.6, fontFamily: 'inherit' }}>
        {submitting ? '送信中...' : '回答を送信'}
      </button>
    </div>
  );
}

// ─── One sub-question block ────────────────────────────────────────────────────
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
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [answered, setAnswered] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const startedAtRef = useRef<string | null>(null);

  // 最初に入力が始まったタイミングで started_at を記録
  const handleChange = (field: keyof AnswerState, value: string) => {
    if (!startedAtRef.current && value.length > 0) {
      startedAtRef.current = new Date().toISOString();
    }
    setState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/questions/${questionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub_question_id: sub.id,
        ...state,
        started_at: startedAtRef.current,
      }),
    });
    setSubmitting(false);
    if (!res.ok) return;
    const data: AnswerResult = await res.json();
    setResult(data);
    if (data.is_correct && data.explanation) {
      setExplanation(data.explanation);
    }
    if (!answered) { setAnswered(true); onFirstAnswer(); }
  };

  const reset = () => {
    setResult(null);
    setState(emptyAnswer());
    startedAtRef.current = null;
  };

  return (
    <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      {/* Sub header */}
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
            {result.is_correct && explanation && <ExplanationPanel exp={explanation} mode={mode} />}
            {!result.is_correct && result.explanation_unlocked && !explanation && (
              <UnlockExplanationButton questionId={questionId} subQuestionId={sub.id} mode={mode} onUnlocked={exp => setExplanation(exp)} />
            )}
            {!result.is_correct && explanation && <ExplanationPanel exp={explanation} mode={mode} />}
            <button onClick={reset} style={{ marginTop: 10, fontSize: 12, color: '#6b7280', background: 'none', border: '0.5px solid #d1d5db', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              もう一度解く
            </button>
          </div>
        ) : (
          <AnswerForm
            mode={mode}
            state={state}
            onChange={handleChange}
            onSubmit={handleSubmit}
            submitting={submitting}
            questionId={questionId}
            subQuestionId={sub.id}
          />
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

  // For main question (no sub-questions)
  const [state, setState] = useState<AnswerState>(emptyAnswer());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [answered, setAnswered] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);

  // started_at: 最初に入力が始まったタイミングで記録
  const startedAtRef = useRef<string | null>(null);

  // Track how many sub-questions have been answered (for onAnswered callback)
  const [answeredSubCount, setAnsweredSubCount] = useState(0);
  const answeredSubCountRef = { current: answeredSubCount };

  // フォーカス離脱検知（問題が展開されている間だけ有効）
  useFocusTracking(questionId, expanded);

  useEffect(() => {
    fetch(`/api/questions/${questionId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setQuestion(data); setLoading(false); })
      .catch(() => { setError('問題の取得に失敗しました'); setLoading(false); });
  }, [questionId]);

  // 問題展開時にログ
  useEffect(() => {
    if (expanded && question) {
      sendLog('question_opened', { question_id: questionId });
    }
  }, [expanded, question, questionId]);

  const handleMainChange = (field: keyof AnswerState, value: string) => {
    if (!startedAtRef.current && value.length > 0) {
      startedAtRef.current = new Date().toISOString();
    }
    setState(prev => ({ ...prev, [field]: value }));
  };

  const handleMainSubmit = async () => {
    if (!question) return;
    setSubmitting(true);
    const res = await fetch(`/api/questions/${questionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...state,
        started_at: startedAtRef.current,
      }),
    });
    setSubmitting(false);
    if (!res.ok) { setError('送信に失敗しました'); return; }
    const data: AnswerResult = await res.json();
    setResult(data);
    if (data.is_correct && data.explanation) {
      setExplanation(data.explanation);
    }
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

      {/* Body */}
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
              {result.is_correct && explanation && <ExplanationPanel exp={explanation} mode={question.answer_mode} />}
              {!result.is_correct && result.explanation_unlocked && !explanation && (
                <UnlockExplanationButton questionId={questionId} mode={question.answer_mode} onUnlocked={exp => setExplanation(exp)} />
              )}
              {!result.is_correct && explanation && <ExplanationPanel exp={explanation} mode={question.answer_mode} />}
              <button
                onClick={() => { setResult(null); setState(emptyAnswer()); startedAtRef.current = null; }}
                style={{ marginTop: 12, fontSize: 12, color: '#6b7280', background: 'none', border: '0.5px solid #d1d5db', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                もう一度解く
              </button>
            </div>
          ) : (
            <AnswerForm
              mode={question.answer_mode}
              state={state}
              onChange={handleMainChange}
              onSubmit={handleMainSubmit}
              submitting={submitting}
              questionId={questionId}
            />
          )}
        </div>
      )}
    </div>
  );
}