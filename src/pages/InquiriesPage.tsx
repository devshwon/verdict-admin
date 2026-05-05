import { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { errorMessage } from '../lib/errors';
import {
  deleteInquiry,
  InquiryStatusFilter,
  listInquiries,
  resolveInquiry,
} from '../lib/inquiries';
import { INQUIRY_STATUS_LABEL, InquiryRow } from '../lib/types';
import { formatKst } from '../lib/date';

const FILTER_TABS: { value: InquiryStatusFilter; label: string }[] = [
  { value: 'open', label: '미처리' },
  { value: 'processed', label: '처리됨' },
  { value: null, label: '전체' },
];

export function InquiriesPage() {
  const toast = useToast();

  const [filter, setFilter] = useState<InquiryStatusFilter>('open');
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<InquiryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listInquiries(filter);
      setRows(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setExpanded(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function toggle(row: InquiryRow) {
    setExpanded((prev) => (prev === row.id ? null : row.id));
    if (notes[row.id] === undefined) {
      setNotes((prev) => ({ ...prev, [row.id]: row.admin_note ?? '' }));
    }
  }

  async function handleResolve(row: InquiryRow, status: 'resolved' | 'dismissed') {
    setSubmitting(row.id);
    try {
      await resolveInquiry(row.id, status, notes[row.id] ?? '');
      toast.success(status === 'resolved' ? '처리 완료' : '기각 처리');
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInquiry(deleteTarget.id);
      toast.success('삭제되었습니다.');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>문의사항</h1>
          <div className="subtitle">사용자 문의 큐 (단방향 접수)</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.value;
          return (
            <button
              key={String(tab.value)}
              className={active ? 'primary' : ''}
              onClick={() => setFilter(tab.value)}
              style={{ fontSize: 13 }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">표시할 문의가 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row) => {
            const open = expanded === row.id;
            const note = notes[row.id] ?? row.admin_note ?? '';
            const busy = submitting === row.id;
            const firstLine = row.message.split('\n')[0];
            return (
              <div
                key={row.id}
                className="card"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                <div
                  onClick={() => toggle(row)}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    borderBottom: open ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontWeight: 600 }}>
                      {row.nickname || (
                        <span style={{ color: 'var(--text-mute)' }}>(미입력)</span>
                      )}
                    </div>
                    <code style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                      {row.user_short}
                    </code>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {firstLine}
                  </div>
                  <span
                    className={`badge ${
                      row.status === 'open'
                        ? 'pending'
                        : row.status === 'resolved'
                          ? 'active'
                          : 'closed'
                    }`}
                  >
                    {INQUIRY_STATUS_LABEL[row.status]}
                  </span>
                  <span
                    style={{ fontSize: 12, color: 'var(--text-mute)', minWidth: 130 }}
                  >
                    {formatKst(row.created_at)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                    {open ? '▲' : '▼'}
                  </span>
                </div>

                {open && (
                  <div style={{ padding: 18, background: '#f9fafc' }}>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-mute)',
                          marginBottom: 4,
                        }}
                      >
                        메시지
                      </div>
                      <div
                        style={{
                          background: '#fff',
                          padding: 12,
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.6,
                        }}
                      >
                        {row.message}
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label htmlFor={`note-${row.id}`}>운영자 메모</label>
                      <textarea
                        id={`note-${row.id}`}
                        rows={3}
                        value={note}
                        disabled={busy}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        placeholder="처리 내용/사유 (선택)"
                      />
                      {row.resolved_at && (
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-mute)',
                            marginTop: 4,
                          }}
                        >
                          처리 시각 {formatKst(row.resolved_at)}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        onClick={() => setDeleteTarget(row)}
                        disabled={busy}
                        className="danger"
                      >
                        삭제
                      </button>
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={() => handleResolve(row, 'dismissed')}
                        disabled={busy}
                      >
                        기각
                      </button>
                      <button
                        onClick={() => handleResolve(row, 'resolved')}
                        disabled={busy}
                        className="primary"
                      >
                        처리 완료
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
        open={!!deleteTarget}
        title="문의 삭제"
        description="삭제 후 복구할 수 없습니다. 정말 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      >
        {deleteTarget && (
          <div
            style={{
              background: '#f9fafc',
              padding: 12,
              border: '1px solid var(--border)',
              borderRadius: 6,
              maxHeight: 160,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 13,
            }}
          >
            {deleteTarget.message}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
