import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { errorMessage } from '../lib/errors';
import {
  SettingCategory,
  SettingRow,
  getSettings,
  setSetting,
} from '../lib/admin-config';
import { formatKst } from '../lib/date';

const CATEGORY_META: Record<SettingCategory, { label: string; icon: string }> = {
  payout: { label: '지급 (PAYOUT)', icon: '💰' },
  moderation: { label: '검열 (MODERATION)', icon: '🛡️' },
  ad: { label: '광고 (AD)', icon: '📺' },
  system: { label: '시스템 (SYSTEM)', icon: '⚙️' },
  prompt: { label: '프롬프트 (PROMPT)', icon: '✨' },
  toss: { label: '토스 (TOSS)', icon: '🟦' },
};

const CATEGORY_ORDER: SettingCategory[] = [
  'payout',
  'moderation',
  'ad',
  'system',
  'prompt',
  'toss',
];

interface PendingChange {
  row: SettingRow;
  newValue: unknown;
  reason: string;
}

interface DraftState {
  // key -> draft value (string for int/text, boolean for bool, string for jsonb)
  values: Record<string, string | boolean>;
}

function valueToInput(row: SettingRow): string | boolean {
  switch (row.value_type) {
    case 'bool':
      return Boolean(row.value);
    case 'int':
      return String(row.value ?? '');
    case 'text':
      return String(row.value ?? '');
    case 'jsonb':
      return JSON.stringify(row.value ?? null, null, 2);
  }
}

function parseDraft(row: SettingRow, draft: string | boolean): unknown {
  switch (row.value_type) {
    case 'bool':
      return Boolean(draft);
    case 'int': {
      const s = String(draft).trim();
      if (s === '') throw new Error('값을 입력하세요');
      const n = Number(s);
      if (!Number.isFinite(n)) throw new Error('정수가 아닙니다');
      if (!Number.isInteger(n)) throw new Error('정수만 허용됩니다');
      if (row.min_value != null && n < row.min_value)
        throw new Error(`최소값(${row.min_value}) 미만입니다`);
      if (row.max_value != null && n > row.max_value)
        throw new Error(`최대값(${row.max_value}) 초과입니다`);
      return n;
    }
    case 'text': {
      const s = String(draft);
      if (s.trim() === '') throw new Error('값을 입력하세요');
      return s;
    }
    case 'jsonb': {
      try {
        return JSON.parse(String(draft));
      } catch {
        throw new Error('유효하지 않은 JSON');
      }
    }
  }
}

function isDirty(row: SettingRow, draft: string | boolean): boolean {
  const orig = valueToInput(row);
  return orig !== draft;
}

export function SettingsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | SettingCategory>('all');
  const [draft, setDraft] = useState<DraftState>({ values: {} });
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSettings();
      setRows(data);
      const next: Record<string, string | boolean> = {};
      for (const r of data) next[r.key] = valueToInput(r);
      setDraft({ values: next });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const grouped = useMemo(() => {
    const acc: Record<string, SettingRow[]> = {};
    for (const r of rows) {
      if (filter !== 'all' && r.category !== filter) continue;
      (acc[r.category] ??= []).push(r);
    }
    return acc;
  }, [rows, filter]);

  function attemptSave(row: SettingRow) {
    try {
      const drafted = draft.values[row.key];
      const parsed = parseDraft(row, drafted);
      // 변경 없음
      if (JSON.stringify(parsed) === JSON.stringify(row.value)) {
        toast.error('변경된 값이 없습니다.');
        return;
      }
      setPending({ row, newValue: parsed, reason: '' });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function handleConfirm(e?: FormEvent) {
    e?.preventDefault();
    if (!pending) return;
    if (
      pending.row.risk_level === 'high' &&
      pending.reason.trim() === ''
    ) {
      toast.error('변경 사유를 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      await setSetting(
        pending.row.key,
        pending.newValue,
        pending.reason.trim() || null
      );
      toast.success(`${pending.row.key} 저장 완료`);
      setPending(null);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>운영 설정</h1>
          <div className="subtitle">
            지급 / 검열 / 광고 / 시스템 / 프롬프트 통합 설정
          </div>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | SettingCategory)}
          style={{ width: 200 }}
        >
          <option value="all">전체 카테고리</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_META[c].icon} {CATEGORY_META[c].label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {CATEGORY_ORDER.map((cat) => {
            const list = grouped[cat] ?? [];
            if (list.length === 0) return null;
            return (
              <section key={cat} className="card">
                <h2 style={{ marginTop: 0, fontSize: 16 }}>
                  {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {list.map((row) => {
                    const drafted = draft.values[row.key];
                    const dirty = isDirty(row, drafted);
                    return (
                      <div
                        key={row.key}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: 12,
                          background: dirty ? 'rgba(217, 119, 6, 0.05)' : '#fff',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            marginBottom: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <code style={{ fontSize: 13, fontWeight: 600 }}>{row.key}</code>
                          {row.risk_level === 'high' && (
                            <span className="badge deleted">⚠️ HIGH</span>
                          )}
                          {row.risk_level === 'medium' && (
                            <span className="badge pending">MEDIUM</span>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--text-mute)',
                              padding: '2px 6px',
                              background: '#eef1f6',
                              borderRadius: 4,
                            }}
                          >
                            {row.value_type}
                          </span>
                        </div>
                        {row.description && (
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--text-mute)',
                              marginBottom: 8,
                            }}
                          >
                            {row.description}
                            {row.value_type === 'int' &&
                              (row.min_value != null || row.max_value != null) && (
                                <span style={{ marginLeft: 8 }}>
                                  ({row.min_value ?? '-∞'} ~ {row.max_value ?? '∞'})
                                </span>
                              )}
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 200 }}>
                            {row.value_type === 'bool' ? (
                              <label
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  marginBottom: 0,
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(drafted)}
                                  onChange={(e) =>
                                    setDraft((p) => ({
                                      values: { ...p.values, [row.key]: e.target.checked },
                                    }))
                                  }
                                  style={{ width: 'auto' }}
                                />
                                {Boolean(drafted) ? 'ON' : 'OFF'}
                              </label>
                            ) : row.value_type === 'jsonb' ? (
                              <textarea
                                value={String(drafted ?? '')}
                                rows={4}
                                onChange={(e) =>
                                  setDraft((p) => ({
                                    values: { ...p.values, [row.key]: e.target.value },
                                  }))
                                }
                                style={{ fontFamily: 'monospace', fontSize: 12 }}
                              />
                            ) : (
                              <input
                                type={row.value_type === 'int' ? 'number' : 'text'}
                                value={String(drafted ?? '')}
                                onChange={(e) =>
                                  setDraft((p) => ({
                                    values: { ...p.values, [row.key]: e.target.value },
                                  }))
                                }
                              />
                            )}
                          </div>
                          <button
                            className="primary"
                            disabled={!dirty}
                            onClick={() => attemptSave(row)}
                          >
                            저장
                          </button>
                          {dirty && (
                            <button
                              className="ghost"
                              onClick={() =>
                                setDraft((p) => ({
                                  values: { ...p.values, [row.key]: valueToInput(row) },
                                }))
                              }
                            >
                              되돌리기
                            </button>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-mute)',
                            marginTop: 8,
                          }}
                        >
                          마지막 변경 {row.updated_at ? formatKst(row.updated_at) : '-'}
                          {row.updated_by_email && ` by ${row.updated_by_email}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        title={
          pending
            ? pending.row.risk_level === 'high'
              ? '⚠️ 위험 설정 변경'
              : '설정 변경 확인'
            : ''
        }
        description={
          pending && (
            <span>
              <code>{pending.row.key}</code>
              <br />
              <strong>이전</strong>:{' '}
              <code>{JSON.stringify(pending.row.value)}</code>
              <br />
              <strong>변경 후</strong>:{' '}
              <code>{JSON.stringify(pending.newValue)}</code>
            </span>
          )
        }
        confirmLabel="저장"
        variant={pending?.row.risk_level === 'high' ? 'danger' : 'default'}
        loading={saving}
        onCancel={() => setPending(null)}
        onConfirm={handleConfirm}
      >
        {pending && pending.row.risk_level === 'high' && (
          <div style={{ marginTop: 12 }}>
            <label htmlFor="pending-reason">변경 사유 (필수)</label>
            <textarea
              id="pending-reason"
              value={pending.reason}
              onChange={(e) =>
                setPending((p) => p && { ...p, reason: e.target.value })
              }
              rows={2}
              autoFocus
              placeholder="예: 검수 완료 후 운영 모드 전환"
            />
          </div>
        )}
        {pending && pending.row.risk_level !== 'high' && (
          <div style={{ marginTop: 12 }}>
            <label htmlFor="pending-reason-opt">변경 사유 (선택)</label>
            <input
              id="pending-reason-opt"
              value={pending.reason}
              onChange={(e) =>
                setPending((p) => p && { ...p, reason: e.target.value })
              }
              placeholder="감사 로그에 기록"
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
