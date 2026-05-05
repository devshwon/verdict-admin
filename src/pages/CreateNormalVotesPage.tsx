import { useMemo, useState } from 'react';
import { useToast } from '../components/Toast';
import { errorMessage } from '../lib/errors';
import {
  DEFAULT_DURATION_MINUTES,
  DURATION_OPTIONS,
  GeneratedTopic,
  NORMAL_CATEGORY_KEYS,
  NORMAL_CATEGORY_LABEL,
  NormalCategoryKey,
  createNormalVote,
  generateNormalVoteTopics,
} from '../lib/admin-create';

type CardStatus = 'idle' | 'submitting' | 'submitted' | 'error';

interface DraftCard {
  key: string;
  category: NormalCategoryKey;
  question: string;
  options: string[];
  duration_minutes: number;
  status: CardStatus;
  errorText?: string;
  voteId?: string;
}

const PER_CATEGORY_COUNT_OPTIONS = [0, 1, 2, 3, 4, 5];

function makeKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyCounts(): Record<NormalCategoryKey, number> {
  return NORMAL_CATEGORY_KEYS.reduce(
    (acc, k) => ({ ...acc, [k]: 0 }),
    {} as Record<NormalCategoryKey, number>
  );
}

export function CreateNormalVotesPage() {
  const toast = useToast();

  const [counts, setCounts] = useState<Record<NormalCategoryKey, number>>(() => ({
    ...emptyCounts(),
    daily: 2,
  }));
  const [defaultDuration, setDefaultDuration] = useState<number>(DEFAULT_DURATION_MINUTES);
  const [generating, setGenerating] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [cards, setCards] = useState<DraftCard[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  const totalRequested = useMemo(
    () => Object.values(counts).reduce((s, n) => s + n, 0),
    [counts]
  );

  function setCount(cat: NormalCategoryKey, n: number) {
    setCounts((prev) => ({ ...prev, [cat]: n }));
  }

  async function handleGenerate() {
    if (totalRequested === 0) {
      toast.error('카테고리별 개수를 1개 이상 지정하세요.');
      return;
    }
    setGenerating(true);
    try {
      const targets = NORMAL_CATEGORY_KEYS.filter((k) => counts[k] > 0);
      // Edge Function 계약은 count 2~5. 1건만 필요한 카테고리는 2건 요청 후 1건만 사용.
      const results = await Promise.all(
        targets.map((cat) => {
          const want = counts[cat];
          const ask = Math.max(2, want);
          return generateNormalVoteTopics(cat, ask, history).then((res) => ({
            cat,
            items: res.items.slice(0, want),
          }));
        })
      );
      const newCards: DraftCard[] = [];
      for (const { cat, items } of results) {
        for (const it of items) {
          newCards.push(toDraft(cat, it, defaultDuration));
        }
      }
      setCards(newCards);
      setHistory((prev) => [...prev, ...newCards.map((c) => c.question)]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate(key: string) {
    const target = cards.find((c) => c.key === key);
    if (!target) return;
    try {
      const res = await generateNormalVoteTopics(target.category, 2, history);
      const fresh = res.items[0];
      if (!fresh) throw new Error('AI가 새 주제를 반환하지 않았습니다.');
      setCards((prev) =>
        prev.map((c) =>
          c.key === key
            ? {
                ...c,
                question: fresh.question,
                options: fresh.options,
                status: 'idle',
                errorText: undefined,
                voteId: undefined,
              }
            : c
        )
      );
      setHistory((prev) => [...prev, fresh.question]);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function removeCard(key: string) {
    setCards((prev) => prev.filter((c) => c.key !== key));
  }

  function updateCard(key: string, patch: Partial<DraftCard>) {
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function updateOption(key: string, idx: number, value: string) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        const next = [...c.options];
        next[idx] = value;
        return { ...c, options: next };
      })
    );
  }

  function addOption(key: string) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        if (c.options.length >= 5) return c;
        return { ...c, options: [...c.options, ''] };
      })
    );
  }

  function removeOption(key: string, idx: number) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        if (c.options.length <= 2) return c;
        return { ...c, options: c.options.filter((_, i) => i !== idx) };
      })
    );
  }

  function validateCard(card: DraftCard): string | null {
    const q = card.question.trim();
    if (q.length < 4) return '질문은 4자 이상이어야 합니다.';
    if (q.length > 60) return '질문은 60자 이내여야 합니다.';
    const opts = card.options.map((o) => o.trim());
    if (opts.length < 2 || opts.length > 5) return '선택지는 2~5개여야 합니다.';
    if (opts.some((o) => o.length === 0)) return '빈 선택지가 있습니다.';
    if (opts.some((o) => o.length > 30)) return '선택지는 각 30자 이내여야 합니다.';
    if (new Set(opts).size !== opts.length) return '중복된 선택지가 있습니다.';
    return null;
  }

  async function submitOne(key: string) {
    const card = cards.find((c) => c.key === key);
    if (!card) return;
    const err = validateCard(card);
    if (err) {
      updateCard(key, { status: 'error', errorText: err });
      return;
    }
    updateCard(key, { status: 'submitting', errorText: undefined });
    try {
      const voteId = await createNormalVote({
        question: card.question.trim(),
        options: card.options.map((o) => o.trim()),
        category: card.category,
        duration_minutes: card.duration_minutes,
      });
      updateCard(key, { status: 'submitted', voteId });
    } catch (e) {
      updateCard(key, { status: 'error', errorText: errorMessage(e) });
    }
  }

  async function submitAll() {
    setBulkSubmitting(true);
    try {
      const targets = cards.filter((c) => c.status !== 'submitted');
      for (const c of targets) {
        await submitOne(c.key);
      }
      toast.success(`${targets.length}건 등록 처리 완료`);
    } finally {
      setBulkSubmitting(false);
    }
  }

  const submittedCount = cards.filter((c) => c.status === 'submitted').length;
  const pendingCount = cards.length - submittedCount;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>일반투표 생성기</h1>
          <div className="subtitle">
            AI로 주제 후보를 만들어 검토 후 운영 봇 명의로 일괄 등록합니다.
          </div>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <label>카테고리별 생성 개수</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 8,
            }}
          >
            {NORMAL_CATEGORY_KEYS.map((cat) => (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: '#fff',
                }}
              >
                <span style={{ flex: 1, fontSize: 13 }}>{NORMAL_CATEGORY_LABEL[cat]}</span>
                <select
                  value={counts[cat]}
                  onChange={(e) => setCount(cat, Number(e.target.value))}
                  style={{ width: 64 }}
                >
                  {PER_CATEGORY_COUNT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div>
            <label>마감 기본값</label>
            <select
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--text-mute)', alignSelf: 'center' }}>
            총 {totalRequested}건 요청
          </div>
          <button
            className="primary"
            onClick={handleGenerate}
            disabled={generating || totalRequested === 0}
          >
            {generating ? '생성 중…' : '✨ AI 주제 생성'}
          </button>
        </div>
        {history.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 8 }}>
            누적 생성 {history.length}건 · 중복 회피 컨텍스트 유지 중
          </div>
        )}
      </section>

      {cards.length === 0 ? (
        <div className="empty-state">
          좌측 도구에서 카테고리·개수를 정하고 [AI 주제 생성]을 누르세요.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cards.map((c) => (
              <CardEditor
                key={c.key}
                card={c}
                onChange={(patch) => updateCard(c.key, patch)}
                onOptionChange={(i, v) => updateOption(c.key, i, v)}
                onAddOption={() => addOption(c.key)}
                onRemoveOption={(i) => removeOption(c.key, i)}
                onRegenerate={() => handleRegenerate(c.key)}
                onRemove={() => removeCard(c.key)}
                onSubmit={() => submitOne(c.key)}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ color: 'var(--text-mute)', fontSize: 13 }}>
              총 {cards.length}건 · 등록 완료 {submittedCount}건 · 남음 {pendingCount}건
            </div>
            <button
              className="primary"
              disabled={bulkSubmitting || pendingCount === 0}
              onClick={submitAll}
            >
              {bulkSubmitting ? '등록 중…' : `모두 등록 (${pendingCount}건)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function toDraft(
  category: NormalCategoryKey,
  item: GeneratedTopic,
  duration: number
): DraftCard {
  return {
    key: makeKey(),
    category,
    question: item.question,
    options: item.options,
    duration_minutes: duration,
    status: 'idle',
  };
}

interface CardEditorProps {
  card: DraftCard;
  onChange: (patch: Partial<DraftCard>) => void;
  onOptionChange: (idx: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (idx: number) => void;
  onRegenerate: () => void;
  onRemove: () => void;
  onSubmit: () => void;
}

function CardEditor({
  card,
  onChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onRegenerate,
  onRemove,
  onSubmit,
}: CardEditorProps) {
  const isSubmitted = card.status === 'submitted';
  const isSubmitting = card.status === 'submitting';

  return (
    <div
      className="card"
      style={{
        opacity: isSubmitted ? 0.55 : 1,
        borderColor: card.status === 'error' ? 'var(--danger)' : 'var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={card.category}
            disabled={isSubmitted || isSubmitting}
            onChange={(e) => onChange({ category: e.target.value as NormalCategoryKey })}
            style={{ width: 'auto' }}
          >
            {NORMAL_CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {NORMAL_CATEGORY_LABEL[k]}
              </option>
            ))}
          </select>
          {isSubmitted && <span className="badge active">등록 완료 ✓</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="ghost"
            disabled={isSubmitted || isSubmitting}
            onClick={onRegenerate}
            style={{ fontSize: 12 }}
          >
            재생성
          </button>
          <button
            className="ghost"
            disabled={isSubmitting}
            onClick={onRemove}
            style={{ fontSize: 12 }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>질문 ({card.question.trim().length}/60)</label>
        <input
          value={card.question}
          disabled={isSubmitted || isSubmitting}
          maxLength={60}
          onChange={(e) => onChange({ question: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>선택지 ({card.options.length}/5)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {card.options.map((opt, i) => (
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
                disabled={isSubmitted || isSubmitting}
                maxLength={30}
                onChange={(e) => onOptionChange(i, e.target.value)}
              />
              <button
                className="ghost"
                disabled={isSubmitted || isSubmitting || card.options.length <= 2}
                onClick={() => onRemoveOption(i)}
                style={{ fontSize: 12 }}
              >
                ×
              </button>
            </div>
          ))}
          {card.options.length < 5 && !isSubmitted && (
            <button
              className="ghost"
              disabled={isSubmitting}
              onClick={onAddOption}
              style={{ alignSelf: 'flex-start', fontSize: 12 }}
            >
              + 선택지 추가
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <label>마감</label>
          <select
            value={card.duration_minutes}
            disabled={isSubmitted || isSubmitting}
            onChange={(e) => onChange({ duration_minutes: Number(e.target.value) })}
            style={{ width: 'auto' }}
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {card.errorText && (
            <span style={{ color: 'var(--danger)', fontSize: 12 }}>{card.errorText}</span>
          )}
          {isSubmitted ? (
            <span style={{ color: 'var(--success)', fontSize: 12 }}>
              ID {card.voteId?.slice(0, 8)}
            </span>
          ) : (
            <button className="primary" disabled={isSubmitting} onClick={onSubmit}>
              {isSubmitting ? '등록 중…' : '등록'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
