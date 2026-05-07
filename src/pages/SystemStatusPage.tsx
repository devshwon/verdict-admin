import { useEffect, useState } from 'react';
import { errorMessage } from '../lib/errors';
import { SystemStatus, getSystemStatus } from '../lib/admin-config';
import { formatKst } from '../lib/date';

export function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const data = await getSystemStatus();
      setStatus(data);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>시스템 상태</h1>
          <div className="subtitle">DRY_RUN / pg_cron / OpenAI 호출 / 광고 키 (read-only)</div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? '새로고침 중…' : '새로고침'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading || !status ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>💸 토스포인트 지급 모드</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {status.payout_dry_run ? (
                <>
                  <span className="badge pending" style={{ fontSize: 13 }}>
                    ⚠️ DRY_RUN ON
                  </span>
                  <span style={{ color: 'var(--warn)' }}>
                    가짜 transaction_id 발급 중 — 실 지급 차단됨
                  </span>
                </>
              ) : (
                <>
                  <span className="badge active" style={{ fontSize: 13 }}>
                    LIVE
                  </span>
                  <span style={{ color: 'var(--text-mute)' }}>
                    실 토스포인트 지급 진행 중
                  </span>
                </>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 8 }}>
              모드 변경은 운영 설정의 <code>payout_dry_run</code> 항목에서 가능합니다.
            </div>
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>⏰ pg_cron 잡</h2>
            {status.cron_jobs.length === 0 ? (
              <div className="empty-state" style={{ padding: 12 }}>
                cron 데이터를 가져올 수 없습니다 (권한 또는 미설치).
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>jobname</th>
                    <th>schedule</th>
                    <th>최근 실행</th>
                    <th>상태</th>
                    <th>24h 실패</th>
                  </tr>
                </thead>
                <tbody>
                  {status.cron_jobs.map((j) => (
                    <tr key={j.jobname}>
                      <td>
                        <code style={{ fontSize: 12 }}>{j.jobname}</code>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                          {j.schedule}
                        </code>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {j.last_run_at ? formatKst(j.last_run_at) : '-'}
                      </td>
                      <td>
                        {j.last_status === 'succeeded' ? (
                          <span className="badge active">✅ 성공</span>
                        ) : j.last_status === 'failed' ? (
                          <span className="badge deleted">❌ 실패</span>
                        ) : (
                          <span className="badge">{j.last_status ?? '-'}</span>
                        )}
                      </td>
                      <td>
                        {j.recent_failure_count > 0 ? (
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                            {j.recent_failure_count}건
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>🤖 OpenAI 호출 (오늘, KST)</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>검열 호출</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {status.openai_today.moderation_today.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>주제 생성</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {status.openai_today.topic_gen_today.toLocaleString()}
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>🔑 시크릿 / 환경 키</h2>
            <div style={{ fontSize: 13, color: 'var(--text-mute)' }}>
              Edge Function 환경변수 / 광고 SDK 키는 DB에서 직접 확인할 수 없습니다.
              <br />
              상태는 <code>payout-points</code> Edge Function 호출 결과로 판단하세요.
              광고 키는 <code>src/config/ads.ts</code> 변경 후 재배포가 필요합니다.
            </div>
          </section>

          <div style={{ fontSize: 11, color: 'var(--text-mute)', textAlign: 'right' }}>
            조회 시각: {formatKst(status.fetched_at)}
          </div>
        </div>
      )}
    </div>
  );
}
