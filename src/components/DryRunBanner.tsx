import { useEffect, useState } from 'react';
import { getSettings, getSystemStatus } from '../lib/admin-config';

const POLL_MS = 5 * 60 * 1000;

export function DryRunBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const [statusRaw, settings] = await Promise.all([
          getSystemStatus(),
          getSettings('system'),
        ]);
        if (cancelled) return;
        const dryRun = Boolean(
          (statusRaw as { payout_dry_run?: unknown } | null)?.payout_dry_run
        );
        const bannerEnabled = settings.find(
          (s) => s.key === 'admin_dashboard_show_dry_run_banner'
        );
        const wantBanner = bannerEnabled ? Boolean(bannerEnabled.value) : true;
        setShow(dryRun && wantBanner);
      } catch {
        if (!cancelled) setShow(false);
      }
    }

    check();
    const id = window.setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#fef3c7',
        color: '#92400e',
        borderBottom: '1px solid #fbbf24',
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 500,
        textAlign: 'center',
      }}
    >
      ⚠️ DRY_RUN 모드 — 토스포인트 실 지급이 중단된 상태입니다. (시뮬레이션 transaction_id 만 발급)
    </div>
  );
}
