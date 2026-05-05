import { FormEvent, useState } from 'react';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { errorMessage } from '../lib/errors';
import { findUser, isCurrentlyBlocked, unblockUser } from '../lib/users';
import { UserSearchRow } from '../lib/types';
import { formatKst, formatKstDate } from '../lib/date';

type SearchMode = 'email' | 'short';

export function UsersPage() {
  const toast = useToast();
  const [mode, setMode] = useState<SearchMode>('email');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [rows, setRows] = useState<UserSearchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<UserSearchRow | null>(null);
  const [unblocking, setUnblocking] = useState(false);

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const data = await findUser(
        mode === 'email' ? { email: query } : { short: query }
      );
      setRows(data);
      setSearched(true);
    } catch (err) {
      setError(errorMessage(err));
      setRows([]);
    } finally {
      setSearching(false);
    }
  }

  async function confirmUnblock() {
    if (!target) return;
    setUnblocking(true);
    try {
      await unblockUser(target.id);
      toast.success('차단을 해제했습니다.');
      setTarget(null);
      // 같은 검색 조건으로 새로고침
      const data = await findUser(
        mode === 'email' ? { email: query } : { short: query }
      );
      setRows(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUnblocking(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>사용자</h1>
          <div className="subtitle">등록 차단 조회 / 해제</div>
        </div>
      </div>

      <form className="card" onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setMode('email')}
            className={mode === 'email' ? 'primary' : ''}
            style={{ fontSize: 13 }}
          >
            이메일
          </button>
          <button
            type="button"
            onClick={() => setMode('short')}
            className={mode === 'short' ? 'primary' : ''}
            style={{ fontSize: 13 }}
          >
            short (앞 4자리)
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="user-query">
              {mode === 'email' ? '이메일 (정확히 일치)' : 'user_short (예: 9F2C)'}
            </label>
            <input
              id="user-query"
              type={mode === 'email' ? 'email' : 'text'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'email' ? 'user@example.com' : '9F2C'}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="primary" disabled={searching || !query.trim()}>
            {searching ? '조회 중…' : '조회'}
          </button>
        </div>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {searched && rows.length === 0 && !error && (
        <div className="empty-state">조회된 사용자가 없습니다.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((row) => {
          const blocked = isCurrentlyBlocked(row);
          return (
            <div key={row.id} className="card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    <code
                      style={{
                        fontSize: 12,
                        background: '#eef1f6',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {row.user_short}
                    </code>
                    <span style={{ fontWeight: 600 }}>
                      {row.email || (
                        <span style={{ color: 'var(--text-mute)' }}>(이메일 없음)</span>
                      )}
                    </span>
                    {row.is_admin && <span className="badge active">admin</span>}
                    {blocked ? (
                      <span className="badge deleted">차단 중</span>
                    ) : (
                      <span className="badge">정상</span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-mute)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 16,
                      marginTop: 8,
                    }}
                  >
                    <span>
                      차단 만료:{' '}
                      <strong style={{ color: blocked ? 'var(--danger)' : undefined }}>
                        {row.register_blocked_until
                          ? formatKst(row.register_blocked_until)
                          : '-'}
                      </strong>
                    </span>
                    <span>
                      연속 반려: <strong>{row.consecutive_rejections}</strong>
                    </span>
                    <span>
                      일일 반려: <strong>{row.daily_rejection_count}</strong>
                      {row.daily_rejection_date && (
                        <span> ({formatKstDate(row.daily_rejection_date)})</span>
                      )}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 6 }}
                  >
                    user_id <code>{row.id}</code>
                  </div>
                </div>
                <button
                  className="primary"
                  disabled={!blocked && row.consecutive_rejections === 0 && row.daily_rejection_count === 0}
                  onClick={() => setTarget(row)}
                  title={
                    blocked
                      ? '차단을 해제하고 카운터를 리셋합니다'
                      : '차단 만료가 지났더라도 카운터 리셋 가능'
                  }
                >
                  차단 해제 / 카운터 리셋
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!target}
        title="차단 해제"
        description="register_blocked_until 을 비우고 연속/일일 반려 카운터를 모두 초기화합니다."
        confirmLabel="해제"
        loading={unblocking}
        onCancel={() => setTarget(null)}
        onConfirm={confirmUnblock}
      >
        {target && (
          <div style={{ fontSize: 13 }}>
            <div>
              <code>{target.user_short}</code> {target.email || '(이메일 없음)'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 6 }}>
              현재 차단 만료:{' '}
              {target.register_blocked_until
                ? formatKst(target.register_blocked_until)
                : '-'}
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
