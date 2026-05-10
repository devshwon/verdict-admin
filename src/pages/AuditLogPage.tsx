import { useEffect, useState } from 'react';
import { errorMessage } from '../lib/errors';
import { AuditAction, AuditLogRow, getAuditLog } from '../lib/admin-config';
import { formatKst } from '../lib/date';

const PAGE_SIZE = 30;

const ACTION_LABEL: Record<AuditAction, string> = {
  setting_change: '⚙️ 설정 변경',
  toss_promotion_change: '🟦 토스 매핑',
  unblock_user: '🔓 차단 해제',
  grant_admin: '👑 관리자 부여',
  revoke_admin: '🚫 관리자 회수',
  reset_user_data: '🧪 사용자 데이터 초기화',
};

const ACTION_OPTIONS: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: '전체 액션' },
  { value: 'setting_change', label: ACTION_LABEL.setting_change },
  { value: 'toss_promotion_change', label: ACTION_LABEL.toss_promotion_change },
  { value: 'unblock_user', label: ACTION_LABEL.unblock_user },
  { value: 'grant_admin', label: ACTION_LABEL.grant_admin },
  { value: 'revoke_admin', label: ACTION_LABEL.revoke_admin },
  { value: 'reset_user_data', label: ACTION_LABEL.reset_user_data },
];

export function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [targetFilter, setTargetFilter] = useState('');
  const [appliedTarget, setAppliedTarget] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLog({
        action: actionFilter === 'all' ? null : actionFilter,
        target_key: appliedTarget || null,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      setError(errorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, appliedTarget, page]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>감사 로그</h1>
          <div className="subtitle">설정 / 매핑 / 사용자 권한 변경 이력</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180 }}>
            <label htmlFor="audit-action">액션</label>
            <select
              id="audit-action"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as AuditAction | 'all');
                setPage(0);
              }}
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="audit-target">target_key (정확히 일치)</label>
            <input
              id="audit-target"
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              placeholder="payout_dry_run / user_id / promotion trigger"
            />
          </div>
          <button
            className="primary"
            onClick={() => {
              setPage(0);
              setAppliedTarget(targetFilter.trim());
            }}
          >
            검색
          </button>
          {appliedTarget && (
            <button
              onClick={() => {
                setTargetFilter('');
                setAppliedTarget('');
                setPage(0);
              }}
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">로그가 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row) => (
            <div key={row.id} className="card" style={{ padding: 12 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginBottom: 6,
                }}
              >
                <span className="badge">{ACTION_LABEL[row.action] ?? row.action}</span>
                {row.target_key && (
                  <code style={{ fontSize: 12 }}>{row.target_key}</code>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                  {formatKst(row.created_at)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 4 }}>
                by {row.admin_email ?? row.admin_id ?? '?'}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <ValueBlock label="이전" value={row.prev_value} />
                <ValueBlock label="이후" value={row.new_value} />
              </div>
              {row.reason && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    background: '#f9fafc',
                    padding: '6px 8px',
                    borderRadius: 4,
                  }}
                >
                  💬 {row.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginTop: 12,
          alignItems: 'center',
        }}
      >
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          ◀ 이전
        </button>
        <span style={{ fontSize: 13 }}>{page + 1}</span>
        <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
          다음 ▶
        </button>
      </div>
    </div>
  );
}

function ValueBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 2 }}>
        {label}
      </div>
      <pre
        style={{
          margin: 0,
          padding: 6,
          background: '#f9fafc',
          borderRadius: 4,
          fontSize: 11,
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: 120,
          overflow: 'auto',
        }}
      >
        {value === null || value === undefined
          ? '-'
          : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
