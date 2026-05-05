import { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { errorMessage } from '../lib/errors';
import { getVoteReports, listReportedVotes, restoreVote } from '../lib/reports';
import { softDeleteVote } from '../lib/votes';
import { ReportedVoteRow, VoteReport, CATEGORY_LABEL } from '../lib/types';
import { formatKst } from '../lib/date';

type Action = 'reject' | 'restore';

export function ReportsPage() {
  const toast = useToast();
  const [onlyPending, setOnlyPending] = useState(true);
  const [rows, setRows] = useState<ReportedVoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [reportsByVote, setReportsByVote] = useState<Record<string, VoteReport[]>>({});
  const [reportsLoading, setReportsLoading] = useState<string | null>(null);

  const [action, setAction] = useState<{ row: ReportedVoteRow; type: Action } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listReportedVotes(onlyPending);
      setRows(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyPending]);

  async function toggleExpand(row: ReportedVoteRow) {
    if (expanded === row.id) {
      setExpanded(null);
      return;
    }
    setExpanded(row.id);
    if (!reportsByVote[row.id]) {
      setReportsLoading(row.id);
      try {
        const reports = await getVoteReports(row.id);
        setReportsByVote((prev) => ({ ...prev, [row.id]: reports }));
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setReportsLoading(null);
      }
    }
  }

  async function submit() {
    if (!action) return;
    setSubmitting(true);
    try {
      if (action.type === 'reject') {
        await softDeleteVote(action.row.id, reason);
        toast.success('반려 처리되었습니다.');
      } else {
        await restoreVote(action.row.id, reason);
        toast.success('유지 처리되었습니다.');
      }
      setAction(null);
      setReason('');
      await load();
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
          <h1>신고 처리</h1>
          <div className="subtitle">신고가 1건 이상 누적된 투표</div>
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            margin: 0,
            color: 'var(--text)',
          }}
        >
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
            style={{ width: 'auto' }}
          />
          미처리만 보기
        </label>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">신고 내역이 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row) => {
            const open = expanded === row.id;
            return (
              <div
                key={row.id}
                className="card"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                <div
                  onClick={() => toggleExpand(row)}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    borderBottom: open ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span className="badge">
                    {CATEGORY_LABEL[row.category as keyof typeof CATEGORY_LABEL] ??
                      row.category}
                  </span>
                  <div style={{ flex: 1, fontWeight: 500 }}>{row.question}</div>
                  <span
                    className="badge"
                    style={{
                      background: '#fee2e2',
                      color: '#991b1b',
                    }}
                  >
                    신고 {row.reports_count}
                  </span>
                  <span className={`badge ${row.status}`}>{row.status}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                    마지막 {formatKst(row.last_reported_at)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                    {open ? '▲' : '▼'}
                  </span>
                </div>

                {open && (
                  <div style={{ padding: 18, background: '#f9fafc' }}>
                    {reportsLoading === row.id ? (
                      <span className="spinner" />
                    ) : (reportsByVote[row.id] ?? []).length === 0 ? (
                      <div style={{ color: 'var(--text-mute)' }}>신고 상세가 없습니다.</div>
                    ) : (
                      <table style={{ marginBottom: 16 }}>
                        <thead>
                          <tr>
                            <th>시각</th>
                            <th>신고자</th>
                            <th>사유</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(reportsByVote[row.id] ?? []).map((r) => (
                            <tr key={r.id} style={{ cursor: 'default' }}>
                              <td style={{ width: 160 }}>{formatKst(r.created_at)}</td>
                              <td style={{ width: 120 }}>
                                <code style={{ fontSize: 11 }}>{r.reporter_short}</code>
                              </td>
                              <td>{r.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setAction({ row, type: 'restore' });
                          setReason('');
                        }}
                      >
                        유지 (false positive)
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          setAction({ row, type: 'reject' });
                          setReason('');
                        }}
                      >
                        반려 처리
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!action}
        title={action?.type === 'reject' ? '투표 반려' : '투표 유지'}
        description={
          action?.type === 'reject'
            ? '신고 내용을 검토한 결과 부적절하다고 판단합니다.'
            : 'false positive — 신고가 부당하므로 유지합니다.'
        }
        confirmLabel={action?.type === 'reject' ? '반려' : '유지'}
        variant={action?.type === 'reject' ? 'danger' : 'default'}
        loading={submitting}
        onCancel={() => setAction(null)}
        onConfirm={submit}
      >
        {action && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{action.row.question}</div>
            <label htmlFor="reason">처리 사유 (필수)</label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                action.type === 'reject'
                  ? '예) 욕설/혐오 표현 다수 신고 확인'
                  : '예) 신고 사유가 정책 위반에 해당하지 않음'
              }
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
