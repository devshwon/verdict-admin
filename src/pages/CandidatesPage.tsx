import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmergencyTodayModal } from '../components/EmergencyTodayModal';
import { errorMessage } from '../lib/errors';
import { listCandidates, publishToday } from '../lib/candidates';
import {
  CategoryKey,
  CATEGORY_KEYS,
  CATEGORY_LABEL,
  CandidateRow,
} from '../lib/types';
import { kstToday, kstYesterday, formatKst, formatKstDate } from '../lib/date';

type Selections = Partial<Record<CategoryKey, string>>;

export function CandidatesPage() {
  const toast = useToast();

  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Selections>({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emergencyCategory, setEmergencyCategory] = useState<CategoryKey | null>(null);
  const [emergencyPublished, setEmergencyPublished] = useState<Partial<Record<CategoryKey, string>>>({});

  const yesterday = useMemo(() => kstYesterday(), []);
  const today = useMemo(() => kstToday(), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCandidates(yesterday)
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [yesterday]);

  const grouped = useMemo<Record<CategoryKey, CandidateRow[]>>(() => {
    const acc = {
      daily: [] as CandidateRow[],
      relationship: [] as CandidateRow[],
      work: [] as CandidateRow[],
      game: [] as CandidateRow[],
    };
    for (const c of candidates) {
      const k = c.category as CategoryKey;
      if (k in acc) acc[k].push(c);
    }
    return acc;
  }, [candidates]);

  function pick(category: CategoryKey, voteId: string) {
    setSelections((prev) => ({ ...prev, [category]: voteId }));
  }

  function clearPick(category: CategoryKey) {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  }

  const selectionCount = Object.values(selections).filter(Boolean).length;

  async function handlePublish() {
    setSubmitting(true);
    try {
      await publishToday(selections, today);
      toast.success(`${selectionCount}건 발행 완료`);
      setSelections({});
      setConfirming(false);
      // 발행 후 후보 새로 조회 (today 로 승격되어 후보 풀에서 빠짐)
      const fresh = await listCandidates(yesterday);
      setCandidates(fresh);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>오늘 후보</h1>
          <div className="subtitle">
            발행일 <strong>{formatKstDate(today)}</strong> · 후보 풀{' '}
            {formatKstDate(yesterday)} 등록
          </div>
        </div>
        <button
          className="primary"
          disabled={selectionCount === 0 || loading}
          onClick={() => setConfirming(true)}
        >
          {selectionCount > 0 ? `${selectionCount}건 발행` : '발행'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {CATEGORY_KEYS.map((cat) => {
            const list = grouped[cat];
            const picked = selections[cat];
            const emergencyVoteId = emergencyPublished[cat];
            return (
              <section key={cat} className="card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 16 }}>
                      {CATEGORY_LABEL[cat]}{' '}
                      <span style={{ color: 'var(--text-mute)', fontWeight: 400 }}>
                        후보 {list.length}건
                      </span>
                    </h2>
                    {list.length === 0 && !emergencyVoteId && (
                      <span className="badge blinded" style={{ fontSize: 11 }}>
                        ⚠️ 후보 0건
                      </span>
                    )}
                    {emergencyVoteId && (
                      <span className="badge active" style={{ fontSize: 11 }}>
                        ✅ 운영팀 직접 등록
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!emergencyVoteId && (
                      <button
                        className={list.length === 0 ? 'primary' : ''}
                        style={{ fontSize: 12 }}
                        onClick={() => setEmergencyCategory(cat)}
                        title={
                          list.length === 0
                            ? '후보가 없어 운영팀이 직접 등록'
                            : '후보가 있더라도 쓸만한 게 없을 때 운영팀이 직접 등록 (후보 풀과 무관하게 today 발행)'
                        }
                      >
                        즉시 등록
                      </button>
                    )}
                    {picked && (
                      <button
                        className="ghost"
                        style={{ fontSize: 12 }}
                        onClick={() => clearPick(cat)}
                      >
                        선택 해제
                      </button>
                    )}
                  </div>
                </div>

                {list.length === 0 ? (
                  <div
                    style={{
                      color: 'var(--text-mute)',
                      padding: 12,
                      background: '#f9fafc',
                      borderRadius: 6,
                    }}
                  >
                    어제 등록된 후보가 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {emergencyVoteId && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--warn)',
                          padding: 8,
                          background: '#fffbeb',
                          border: '1px solid #fbbf24',
                          borderRadius: 6,
                        }}
                      >
                        이 카테고리는 운영팀 직접 등록으로 today 가 이미 발행됐습니다. 후보 선택은
                        비활성화됩니다.
                      </div>
                    )}
                    {list.map((c) => {
                      const checked = picked === c.id;
                      const disabled = !!emergencyVoteId;
                      return (
                        <label
                          key={c.id}
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            padding: 12,
                            border: `1px solid ${
                              checked ? 'var(--primary)' : 'var(--border)'
                            }`,
                            borderRadius: 6,
                            background: disabled
                              ? '#f3f4f6'
                              : checked
                              ? 'rgba(37,99,235,0.06)'
                              : '#fff',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.55 : 1,
                            margin: 0,
                          }}
                        >
                          <input
                            type="radio"
                            name={`pick-${cat}`}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => pick(cat, c.id)}
                            style={{ width: 'auto', marginTop: 4 }}
                          />
                          <div style={{ flex: 1, color: 'var(--text)' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                              {c.question}
                            </div>
                            {c.options && c.options.length > 0 && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: 'var(--text-mute)',
                                  marginBottom: 4,
                                }}
                              >
                                {c.options.map((o) => o.option_text).join(' / ')}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--text-mute)',
                                display: 'flex',
                                gap: 12,
                                flexWrap: 'wrap',
                              }}
                            >
                              <span>
                                작성자{' '}
                                <code>
                                  {c.author_id ? c.author_id.slice(0, 8) : '-'}
                                </code>
                              </span>
                              <span>등록 {formatKst(c.created_at)}</span>
                              {typeof c.ai_score === 'number' && (
                                <span>AI {c.ai_score.toFixed(1)}</span>
                              )}
                              <span className={`badge ${c.status}`}>{c.status}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title={`${selectionCount}건 발행하시겠습니까?`}
        description={
          <span>
            발행일: <strong>{formatKstDate(today)}</strong>
            <br />
            발행 즉시 today 로 승격되며 작성자에게 30P가 적립됩니다.
          </span>
        }
        confirmLabel="발행"
        loading={submitting}
        onCancel={() => setConfirming(false)}
        onConfirm={handlePublish}
      >
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {CATEGORY_KEYS.map((cat) => {
            const id = selections[cat];
            if (!id) return null;
            const c = candidates.find((x) => x.id === id);
            return (
              <li key={cat}>
                <strong>{CATEGORY_LABEL[cat]}</strong>: {c?.question ?? id}
              </li>
            );
          })}
        </ul>
      </ConfirmDialog>

      <EmergencyTodayModal
        open={emergencyCategory !== null}
        category={emergencyCategory ?? 'daily'}
        onClose={() => setEmergencyCategory(null)}
        onPublished={(voteId) => {
          if (emergencyCategory) {
            const cat = emergencyCategory;
            setEmergencyPublished((prev) => ({ ...prev, [cat]: voteId }));
            // 동일 카테고리에 이미 today 가 있으면 후보 발행 RPC 가 거부하므로 선택 자동 해제
            clearPick(cat);
            toast.success(`${CATEGORY_LABEL[cat]} 카테고리 즉시 등록 완료`);
          }
        }}
      />
    </div>
  );
}
