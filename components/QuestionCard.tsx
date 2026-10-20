'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { logEvent } from '@/lib/logger';
const KaTeXRenderer = dynamic(() => import('./KaTeXRenderer'), { ssr: false });

interface Question {
  id: string;
  body: string;
  phase: string;
  answer_mode: 'staged' | 'simple';
  allow_attachment: boolean;
  show_feedback: boolean;
}

const STAGED_FIELDS = [
  { key: 'understanding', label: '理解', hint: 'この問題は、結局何を求めればよい？ 自分の言葉で言い換えよう' },
  { key: 'extraction',   label: '抽出', hint: '問題文から、使う情報や条件を書き出そう' },
  { key: 'equation',     label: '式化', hint: 'どんな式・考え方で解く？' },
  { key: 'answer',       label: '解答', hint: '最終的な答えを記入してください（必須）', required: true },
  { key: 'check',        label: '確認', hint: 'その答えが正しいことを、どうやって確かめた？' },
] as const;
type FieldKey = 'understanding' | 'extraction' | 'equation' | 'answer' | 'check';

const f = { fontFamily: '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif' };

export default function QuestionCard({
  question, contentId, isPreview = false
}: {
  question: Question; contentId: string; isPreview?: boolean;
}) {
  const storageKey = `qcard_${question.id}`;
  const [fields, setFields] = useState<Record<FieldKey, string>>({
    understanding: '', extraction: '', equation: '', answer: '', check: '',
  });
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attachUploading, setAttachUploading] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  const editCount = useRef({ inputs: 0, deletes: 0 });

  useEffect(() => {
    if (!isPreview) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setFields(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch {}
    }
    logEvent('question_open', {
      contentId,
      payload: { questionId: question.id, phase: question.phase },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveLocal = (updated: Record<FieldKey, string>) => {
    if (isPreview) return;
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
  };

  const handleChange = (key: FieldKey, value: string) => {
    const updated = { ...fields, [key]: value };
    setFields(updated);
    saveLocal(updated);
  };

  const handleFocus = (key: string) => {
    editCount.current = { inputs: 0, deletes: 0 };
    logEvent('field_focus', { contentId, payload: { questionId: question.id, phase: question.phase, field: key } });
  };

  const handleInput = (e: React.FormEvent) => {
    const native = e.nativeEvent as InputEvent;
    editCount.current.inputs++;
    if (native.inputType?.startsWith('delete')) editCount.current.deletes++;
  };

  const handleBlur = (key: string, value: string) => {
    logEvent('field_blur', { contentId, payload: { questionId: question.id, phase: question.phase, field: key, snapshot: value, length: value.length } });
    logEvent('field_edit_summary', { contentId, payload: { questionId: question.id, phase: question.phase, field: key, inputs: editCount.current.inputs, deletes: editCount.current.deletes } });
  };

  const handleAttachUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'question_attachment');
    fd.append('questionId', question.id);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setAttachmentUrl(data.file_path);
    setAttachmentName(file.name);
    logEvent('attachment_upload', { contentId, payload: { questionId: question.id, filename: file.name, url: data.file_path } });
    setAttachUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.answer.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/questions/${contentId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: question.id,
        ...(question.answer_mode === 'staged' ? {
          understanding: fields.understanding,
          extraction: fields.extraction,
          equation: fields.equation,
          check: fields.check,
        } : {}),
        answer: fields.answer,
        attachment_url: attachmentUrl,
        started_at: startedAt.current,
        isPreview,
      }),
    });
    const data = await res.json();
    setSubmitted(true);
    if (question.show_feedback) setIsCorrect(data.response?.is_correct ?? null);
    logEvent('answer_submit', { contentId, payload: { questionId: question.id, phase: question.phase, attempt: data.response?.attempt, is_correct: data.response?.is_correct } });
    if (!isPreview) {
      try { localStorage.removeItem(storageKey); } catch {}
    }
    setSubmitting(false);
  };

  const phaseLabel = { pre: '事前テスト', practice: '演習', post: '事後テスト' }[question.phase] ?? question.phase;
  const activeFields = question.answer_mode === 'staged' ? STAGED_FIELDS : STAGED_FIELDS.filter(f => f.key === 'answer');

  return (
    <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '20px 22px', background: isPreview ? '#fefce8' : '#fff', marginBottom: 12, ...f }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{phaseLabel}</span>
        {isPreview && <span style={{ fontSize: 11, background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>プレビュー</span>}
      </div>

      <div style={{ marginBottom: 20, fontSize: 14, lineHeight: 1.7, color: '#111827' }}>
        <KaTeXRenderer content={question.body} />
      </div>

      {submitted ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {question.show_feedback && isCorrect !== null ? (
            isCorrect
              ? <p style={{ color: '#16a34a', fontWeight: 700 }}>✓ 正解です！</p>
              : <p style={{ color: '#dc2626', fontWeight: 700 }}>✗ 不正解です。</p>
          ) : (
            <p style={{ color: '#6b7280' }}>解答を提出しました。</p>
          )}
          <button
            style={{ marginTop: 10, fontSize: 12, color: '#378ADD', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
            onClick={() => { setSubmitted(false); startedAt.current = new Date().toISOString(); }}
          >
            再提出する
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {activeFields.map(({ key, label, hint, ...rest }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 3 }}>
                {label}{((rest as any).required) && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 5 }}>{hint}</div>
              {key === 'answer' ? (
                <input type="text" value={fields[key as FieldKey]}
                  onChange={e => handleChange(key as FieldKey, e.target.value)}
                  onFocus={() => handleFocus(key)} onInput={handleInput}
                  onBlur={e => handleBlur(key, e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  required />
              ) : (
                <textarea rows={3} value={fields[key as FieldKey]}
                  onChange={e => handleChange(key as FieldKey, e.target.value)}
                  onFocus={() => handleFocus(key)} onInput={handleInput}
                  onBlur={e => handleBlur(key, e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              )}
            </div>
          ))}

          {question.allow_attachment && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>計算過程（画像/PDF）</div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>
                {attachUploading ? 'アップロード中…' : attachmentName ? `✓ ${attachmentName}` : 'ファイルを選択'}
                <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleAttachUpload} />
              </label>
            </div>
          )}

          <button type="submit" disabled={submitting || !fields.answer.trim()}
            style={{ width: '100%', padding: '10px', background: '#0f1c2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting || !fields.answer.trim() ? 0.5 : 1, fontFamily: 'inherit' }}>
            {submitting ? '提出中…' : '提出する'}
          </button>
        </form>
      )}
    </div>
  );
}