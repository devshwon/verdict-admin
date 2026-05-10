import { FormEvent, useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { errorMessage } from '../lib/errors';
import {
  ResetUserDataResult,
  UserAdminRow,
  grantAdmin,
  isCurrentlyBlocked,
  listUsers,
  resetUserData,
  revokeAdmin,
  unblockUser,
} from '../lib/admin-config';
import { formatKst, formatKstDate } from '../lib/date';

type Tab = 'all' | 'blocked' | 'admin';

const TAB_LABEL: Record<Tab, string> = {
  all: '전체',
  blocked: '차단됨',
  admin: '관리자',
};

const PAGE_SIZE = 20;

interface AdminToggleTarget {
  user: UserAdminRow;
  action: 'grant' | 'revoke';
}

export function UsersPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<UserAdminRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<UserAdminRow | null>(null);
  const [unblockTarget, setUnblockTarget] = useState<UserAdminRow | null>(null);
  const [adminToggle, setAdminToggle] = useState<AdminToggleTarget | null>(null);
  const [adminReason, setAdminReason] = useState('');
  const [resetTarget, setResetTarget] = useState<UserAdminRow | null>(null);
  const [resetReason, setResetReason] = useState('');
  const [resetResult, setResetResult] = useState<ResetUserDataResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers({
        tab,
        search: appliedSearch || null,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(data);
      setTotalCount(data[0]?.total_count ?? 0);
    } catch (e) {
      setError(errorMessage(e));
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, appliedSearch, page]);

  function changeTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    setPage(0);
  }

  function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    setPage(0);
    setAppliedSearch(search.trim());
  }

  async function confirmUnblock() {
    if (!unblockTarget) return;
    setSubmitting(true);
    try {
      await unblockUser(unblockTarget.id);
      toast.success('차단 해제 완료');
      setUnblockTarget(null);
      setDetail(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmResetUserData() {
    if (!resetTarget) return;
    if (resetReason.trim() === '') {
      toast.error('초기화 사유를 입력하세요.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await resetUserData(resetTarget.id, resetReason.trim());
      toast.success('사용자 활동 데이터를 초기화했습니다.');
      setResetTarget(null);
      setResetReason('');
      setDetail(null);
      setResetResult(result);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmAdminToggle() {
    if (!adminToggle) return;
    if (adminReason.trim() === '') {
      toast.error('변경 사유를 입력하세요.');
      return;
    }
    setSubmitting(true);
    try {
      if (adminToggle.action === 'grant') {
        await grantAdmin(adminToggle.user.id, adminReason.trim());
        toast.success('관리자 권한을 부여했습니다.');
      } else {
        await revokeAdmin(adminToggle.user.id, adminReason.trim());
        toast.success('관리자 권한을 회수했습니다.');
      }
      setAdminToggle(null);
      setAdminReason('');
      setDetail(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>사용자 관리</h1>
          <div className="subtitle">탭별 조회 / 차단 해제 / 관리자 권한</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {(['all', 'blocked', 'admin'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? 'primary' : ''}
              onClick={() => changeTab(t)}
              style={{ fontSize: 13 }}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--text-mute)', alignSelf: 'center' }}>
            총 {totalCount.toLocaleString()}명
          </span>
        </div>
        <form
          onSubmit={handleSearch}
          style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}
        >
          <div style={{ flex: 1 }}>
            <label htmlFor="user-search">검색 (이메일 일부 / user_short 4자리)</label>
            <input
              id="user-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="user@example.com / 9F2C"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="primary" disabled={loading}>
            검색
          </button>
          {appliedSearch && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setAppliedSearch('');
                setPage(0);
              }}
            >
              초기화
            </button>
          )}
        </form>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">조회된 사용자가 없습니다.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>이메일</th>
                <th>user_short</th>
                <th>가입일</th>
                <th>상태</th>
                <th>활동</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const blocked = isCurrentlyBlocked(row);
                return (
                  <tr key={row.id} onClick={() => setDetail(row)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {row.email || (
                          <span style={{ color: 'var(--text-mute)' }}>(이메일 없음)</span>
                        )}
                      </div>
                    </td>
                    <td>
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
                    </td>
                    <td style={{ fontSize: 12 }}>{formatKstDate(row.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {row.is_admin && <span className="badge active">👑 admin</span>}
                        {row.is_system && <span className="badge">system</span>}
                        {blocked ? (
                          <span className="badge deleted">⛔ 차단</span>
                        ) : (
                          !row.is_admin &&
                          !row.is_system && <span className="badge">정상</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                      등록 {row.register_count} · 참여 {row.cast_count}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button style={{ fontSize: 12 }} onClick={() => setDetail(row)}>
                        상세
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalCount > PAGE_SIZE && (
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
          <span style={{ fontSize: 13 }}>
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음 ▶
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!detail && !unblockTarget && !adminToggle && !resetTarget}
        title={
          detail
            ? `${detail.email || '(이메일 없음)'} (${detail.user_short})`
            : ''
        }
        confirmLabel="닫기"
        cancelLabel={null}
        onCancel={() => setDetail(null)}
        onConfirm={() => setDetail(null)}
      >
        {detail && (
          <div style={{ fontSize: 13 }}>
            <Row label="user_id" value={<code>{detail.id}</code>} />
            <Row label="email" value={detail.email ?? '-'} />
            <Row label="가입" value={formatKst(detail.created_at)} />
            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
            <Row label="등록한 투표" value={`${detail.register_count}건`} />
            <Row label="참여 (캐스트)" value={`${detail.cast_count}건`} />
            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
            <Row
              label="차단 만료"
              value={
                detail.register_blocked_until
                  ? formatKst(detail.register_blocked_until)
                  : '-'
              }
              danger={isCurrentlyBlocked(detail)}
            />
            <Row label="연속 반려" value={detail.consecutive_rejections} />
            <Row
              label="일일 반려"
              value={`${detail.daily_rejection_count}${
                detail.daily_rejection_date
                  ? ` (${formatKstDate(detail.daily_rejection_date)})`
                  : ''
              }`}
            />
            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
            <Row label="is_admin" value={String(detail.is_admin)} />
            <Row label="is_system" value={String(detail.is_system)} />

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 16,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              {(isCurrentlyBlocked(detail) ||
                detail.consecutive_rejections > 0 ||
                detail.daily_rejection_count > 0) && (
                <button className="primary" onClick={() => setUnblockTarget(detail)}>
                  차단 해제 / 카운터 리셋
                </button>
              )}
              {detail.is_admin ? (
                <button
                  className="danger"
                  onClick={() => {
                    setAdminReason('');
                    setAdminToggle({ user: detail, action: 'revoke' });
                  }}
                >
                  관리자 권한 회수
                </button>
              ) : (
                <button
                  className="primary"
                  onClick={() => {
                    setAdminReason('');
                    setAdminToggle({ user: detail, action: 'grant' });
                  }}
                >
                  관리자 권한 부여
                </button>
              )}
              {!detail.is_admin && !detail.is_system && (
                <button
                  className="danger"
                  title="테스트용 — 활동 데이터 모두 삭제"
                  onClick={() => {
                    setResetReason('');
                    setResetTarget(detail);
                  }}
                >
                  🧪 활동 데이터 초기화
                </button>
              )}
            </div>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!unblockTarget}
        title="차단 해제"
        description="register_blocked_until 을 비우고 연속/일일 반려 카운터를 모두 초기화합니다."
        confirmLabel="해제"
        loading={submitting}
        onCancel={() => setUnblockTarget(null)}
        onConfirm={confirmUnblock}
      >
        {unblockTarget && (
          <div style={{ fontSize: 13 }}>
            <code>{unblockTarget.user_short}</code> {unblockTarget.email || '(이메일 없음)'}
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!resetTarget}
        title="⚠️ 활동 데이터 초기화 (테스트용)"
        description={
          resetTarget && (
            <div>
              <div>
                <code>{resetTarget.user_short}</code>{' '}
                {resetTarget.email || '(이메일 없음)'} 의 활동 데이터를{' '}
                <strong>모두 삭제</strong>합니다.
              </div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12 }}>
                <li>등록한 투표 / 참여 / 후보 공감 / 신고 / 문의</li>
                <li>포인트 로그 / 광고 시청 / 결과 unlock / 무료 패스</li>
                <li>차단/반려/모더레이션/스트릭/보고 카운터 전부 리셋</li>
              </ul>
              <div style={{ marginTop: 8, fontSize: 12 }}>
                계정 자체(가입일/인구통계)는 유지됩니다. 되돌릴 수 없습니다.
              </div>
            </div>
          )
        }
        confirmLabel="초기화 실행"
        variant="danger"
        loading={submitting}
        onCancel={() => {
          setResetTarget(null);
          setResetReason('');
        }}
        onConfirm={confirmResetUserData}
      >
        <div style={{ marginTop: 8 }}>
          <label htmlFor="reset-reason">초기화 사유 (필수)</label>
          <textarea
            id="reset-reason"
            value={resetReason}
            onChange={(e) => setResetReason(e.target.value)}
            rows={2}
            autoFocus
            placeholder="예: QA 테스트 시나리오 재실행"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!resetResult}
        title="초기화 완료"
        confirmLabel="닫기"
        cancelLabel={null}
        onCancel={() => setResetResult(null)}
        onConfirm={() => setResetResult(null)}
      >
        {resetResult && (
          <div style={{ fontSize: 13 }}>
            <div style={{ marginBottom: 8, color: 'var(--text-mute)' }}>
              삭제된 행 수
            </div>
            {Object.entries(resetResult.deleted).map(([k, v]) => (
              <Row key={k} label={k} value={`${v}건`} />
            ))}
            <div style={{ marginTop: 12, color: 'var(--text-mute)' }}>
              users 부가 카운터 {resetResult.reset_columns.length}개 컬럼 리셋
            </div>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!adminToggle}
        title={
          adminToggle?.action === 'grant'
            ? '관리자 권한 부여'
            : '⚠️ 관리자 권한 회수'
        }
        description={
          adminToggle && (
            <span>
              <code>{adminToggle.user.user_short}</code>{' '}
              {adminToggle.user.email || '(이메일 없음)'} 의 권한을{' '}
              {adminToggle.action === 'grant' ? '부여' : '회수'}합니다.
            </span>
          )
        }
        confirmLabel={adminToggle?.action === 'grant' ? '부여' : '회수'}
        variant={adminToggle?.action === 'revoke' ? 'danger' : 'default'}
        loading={submitting}
        onCancel={() => {
          setAdminToggle(null);
          setAdminReason('');
        }}
        onConfirm={confirmAdminToggle}
      >
        <div style={{ marginTop: 8 }}>
          <label htmlFor="admin-reason">변경 사유 (필수)</label>
          <textarea
            id="admin-reason"
            value={adminReason}
            onChange={(e) => setAdminReason(e.target.value)}
            rows={2}
            autoFocus
            placeholder="예: 운영팀 신규 합류 / 퇴사로 회수"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

function Row({
  label,
  value,
  danger,
}: {
  label: string;
  value: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '4px 0',
        fontSize: 13,
      }}
    >
      <div style={{ width: 120, color: 'var(--text-mute)' }}>{label}</div>
      <div style={{ flex: 1, color: danger ? 'var(--danger)' : undefined, fontWeight: danger ? 600 : 400 }}>
        {value}
      </div>
    </div>
  );
}
