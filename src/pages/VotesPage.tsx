import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { errorMessage } from '../lib/errors';
import {
  listVotes,
  softDeleteVote,
  listVoteOptions,
  ListVotesFilter,
} from '../lib/votes';
import {
  CATEGORY_KEYS,
  CATEGORY_LABEL,
  VOTE_STATUS_OPTIONS,
  VoteOption,
  VoteRow,
  VoteStatus,
} from '../lib/types';
import { formatKst } from '../lib/date';

const PAGE_SIZE = 50;

export function VotesPage() {
  const toast = useToast();

  const [category, setCategory] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<VoteStatus[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<VoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<VoteRow | null>(null);
  const [options, setOptions] = useState<VoteOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filter = useMemo<ListVotesFilter>(
    () => ({
      category: category || null,
      status: statusFilter.length > 0 ? statusFilter : null,
      search,
      page,
      pageSize: PAGE_SIZE,
    }),
    [category, statusFilter, search, page]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listVotes(filter)
      .then((data) => {
        if (!cancelled) setRows(data);
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
  }, [filter]);

  function toggleStatus(s: VoteStatus) {
    setPage(0);
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function openDetail(row: VoteRow) {
    setSelected(row);
    setReason('');
    setOptions([]);
    setOptionsLoading(true);
    try {
      const opts = await listVoteOptions(row.id);
      setOptions(opts);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setOptionsLoading(false);
    }
  }

  async function handleSoftDelete() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await softDeleteVote(selected.id, reason);
      toast.success('반려 처리되었습니다.');
      setSelected(null);
      // refresh
      const data = await listVotes(filter);
      setRows(data);
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
          <h1>투표 관리</h1>
          <div className="subtitle">일반투표 검색·반려</div>
        </div>
      </div>

      <div className="toolbar">
        <div>
          <label>카테고리</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">전체</option>
            {CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABEL[k]}
              </option>
            ))}
            <option value="other">기타</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>검색 (질문)</label>
          <input
            type="search"
            placeholder="질문 내용 부분 일치"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {VOTE_STATUS_OPTIONS.map((opt) => {
          const active = statusFilter.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggleStatus(opt.value)}
              className={active ? 'primary' : ''}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {opt.label}
            </button>
          );
        })}
        {statusFilter.length > 0 && (
          <button
            onClick={() => {
              setStatusFilter([]);
              setPage(0);
            }}
            className="ghost"
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            초기화
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">결과가 없습니다.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>카테고리</th>
              <th>질문</th>
              <th style={{ width: 80, textAlign: 'right' }}>참여</th>
              <th style={{ width: 80, textAlign: 'right' }}>신고</th>
              <th>상태</th>
              <th>등록일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} onClick={() => openDetail(row)}>
                <td>
                  <span className="badge">
                    {CATEGORY_LABEL[row.category as keyof typeof CATEGORY_LABEL] ??
                      row.category}
                  </span>
                </td>
                <td>{row.question}</td>
                <td style={{ textAlign: 'right' }}>{row.participants_count ?? 0}</td>
                <td
                  style={{
                    textAlign: 'right',
                    color:
                      row.reports_count && row.reports_count > 0 ? 'var(--danger)' : undefined,
                    fontWeight: row.reports_count ? 600 : 400,
                  }}
                >
                  {row.reports_count ?? 0}
                </td>
                <td>
                  <span className={`badge ${row.status}`}>{row.status}</span>
                </td>
                <td>{formatKst(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
        }}
      >
        <div style={{ color: 'var(--text-mute)', fontSize: 12 }}>
          페이지 {page + 1} · {rows.length}건
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            이전
          </button>
          <button
            disabled={rows.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!selected}
        title="투표 반려 처리"
        description="반려 사유는 감사 로그에 남으며, 사용자에게 노출될 수 있습니다."
        confirmLabel="반려 처리"
        variant="danger"
        loading={submitting}
        onCancel={() => setSelected(null)}
        onConfirm={handleSoftDelete}
      >
        {selected && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <span className="badge">
                {CATEGORY_LABEL[selected.category as keyof typeof CATEGORY_LABEL] ??
                  selected.category}
              </span>{' '}
              <span className={`badge ${selected.status}`}>{selected.status}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              {selected.question}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 4 }}>
                선택지
              </div>
              {optionsLoading ? (
                <span className="spinner" />
              ) : options.length === 0 ? (
                <div style={{ color: 'var(--text-mute)' }}>선택지 없음</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {options.map((o) => (
                    <li key={o.id}>{o.option_text}</li>
                  ))}
                </ul>
              )}
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'var(--text-mute)',
                marginBottom: 12,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <span>참여 {selected.participants_count ?? 0}</span>
              <span>신고 {selected.reports_count ?? 0}</span>
              <span>등록 {formatKst(selected.created_at)}</span>
            </div>

            <label htmlFor="reason">반려 사유 (필수)</label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예) 욕설/혐오 표현 포함"
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
