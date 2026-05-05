import { useMemo, useState } from 'react';
import { CategoryKey, CATEGORY_LABEL } from '../lib/types';
import {
  createTodayVote,
  generateTodayCandidate,
  GeneratedTodayCandidate,
} from '../lib/admin-create';
import { errorMessage } from '../lib/errors';
import { kstToday } from '../lib/date';

type Mode = 'ai' | 'manual';

interface Props {
  open: boolean;
  category: CategoryKey;
  onClose: () => void;
  onPublished: (voteId: string) => void;
}

function tomorrowKst(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function EmergencyTodayModal({ open, category, onClose, onPublished }: Props) {
  const today = useMemo(() => kstToday(), []);
  const tomorrow = useMemo(() => tomorrowKst(), []);

  const [publishDate, setPublishDate] = useState<string>(today);
  const [mode, setMode] = useState<Mode>('ai');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<GeneratedTodayCandidate | null>(null);

  function reset() {
    setMode('ai');
    setQuestion('');
    setOptions(['', '']);
    setAiResult(null);
    setError(null);
    setPublishDate(today);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateTodayCandidate(category);
      setAiResult(res);
      setQuestion(res.question);
      setOptions(res.options.length >= 2 ? res.options : [...res.options, ''].slice(0, 5));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  function updateOption(i: number, v: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  }

  function addOption() {
    setOptions((prev) => (prev.length >= 5 ? prev : [...prev, '']));
  }

  function removeOption(i: number) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function validate(): string | null {
    const q = question.trim();
    if (q.length < 4) return '질문은 4자 이상이어야 합니다.';
    if (q.length > 60) return '질문은 60자 이내여야 합니다.';
    const opts = options.map((o) => o.trim());
    if (opts.length < 2 || opts.length > 5) return '선택지는 2~5개여야 합니다.';
    if (opts.some((o) => o.length === 0)) return '빈 선택지가 있습니다.';
    if (opts.some((o) => o.length > 30)) return '선택지는 각 30자 이내여야 합니다.';
    if (new Set(opts).size !== opts.length) return '중복된 선택지가 있습니다.';
    if (publishDate !== today && publishDate !== tomorrow) {
      return '발행일은 오늘 또는 내일만 가능합니다.';
    }
    return null;
  }

  async function handlePublish() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const voteId = await createTodayVote({
        question: question.trim(),
        options: options.map((o) => o.trim()),
        category,
        publish_date: publishDate,
      });
      onPublished(voteId);
      reset();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560 }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>
          오늘의 투표 즉시 등록 — {CATEGORY_LABEL[category]}
        </h2>

        <div style={{ marginBottom: 12 }}>
          <label>발행일</label>
          <select
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            disabled={submitting}
            style={{ width: 'auto' }}
          >
            <option value={today}>오늘 ({today})</option>
            <option value={tomorrow}>내일 ({tomorrow})</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center' }}>
          <label
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              margin: 0,
              fontSize: 14,
              color: 'var(--text)',
            }}
          >
            <input
              type="radio"
              name="emergency-mode"
              checked={mode === 'ai'}
              onChange={() => setMode('ai')}
              disabled={submitting}
              style={{ width: 'auto' }}
            />
            AI 자동 생성
          </label>
          <label
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              margin: 0,
              fontSize: 14,
              color: 'var(--text)',
            }}
          >
            <input
              type="radio"
              name="emergency-mode"
              checked={mode === 'manual'}
              onChange={() => setMode('manual')}
              disabled={submitting}
              style={{ width: 'auto' }}
            />
            직접 입력
          </label>
        </div>

        {mode === 'ai' && (
          <div style={{ marginBottom: 12 }}>
            <button
              className="primary"
              onClick={handleGenerate}
              disabled={generating || submitting}
              style={{ marginBottom: 8 }}
            >
              {generating ? '생성 중…' : '✨ AI 후보 생성'}
            </button>
            {aiResult && (
              <div
                style={{
                  padding: 10,
                  background: '#f9fafc',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--text-mute)',
                  marginBottom: 8,
                }}
              >
                AI 응답을 아래에서 자유롭게 편집하세요.
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label>질문 ({question.trim().length}/60)</label>
          <input
            value={question}
            disabled={submitting}
            maxLength={60}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="예) 야근 수당 없는 야근 그냥 해?"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>선택지 ({options.length}/5)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span
                  style={{
                    width: 22,
                    textAlign: 'center',
                    color: 'var(--text-mute)',
                    fontSize: 12,
                  }}
                >
                  {i + 1}
                </span>
                <input
                  value={opt}
                  disabled={submitting}
                  maxLength={30}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                <button
                  className="ghost"
                  disabled={submitting || options.length <= 2}
                  onClick={() => removeOption(i)}
                  style={{ fontSize: 12 }}
                >
                  ×
                </button>
              </div>
            ))}
            {options.length < 5 && (
              <button
                className="ghost"
                disabled={submitting}
                onClick={addOption}
                style={{ alignSelf: 'flex-start', fontSize: 12 }}
              >
                + 선택지 추가
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="error-banner" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} disabled={submitting}>
            취소
          </button>
          <button className="primary" onClick={handlePublish} disabled={submitting}>
            {submitting ? '발행 중…' : '발행'}
          </button>
        </div>
      </div>
    </div>
  );
}
