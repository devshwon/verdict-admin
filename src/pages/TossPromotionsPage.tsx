import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { errorMessage } from '../lib/errors';
import {
  TossPromotionRow,
  TOSS_TRIGGERS,
  listTossPromotions,
  tossTriggerLabel,
  upsertTossPromotion,
} from '../lib/admin-config';
import { formatKst } from '../lib/date';

interface EditState {
  trigger: string;
  promotion_id: string;
  promotion_name: string;
  test_mode: boolean;
  notes: string;
  isExisting: boolean;
}

type GoLiveTarget = TossPromotionRow & { _kind: 'one' };

export function TossPromotionsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<TossPromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkLive, setBulkLive] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [goLive, setGoLive] = useState<GoLiveTarget | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listTossPromotions();
      const byTrigger = new Map(data.map((r) => [r.trigger, r] as const));
      const merged: TossPromotionRow[] = TOSS_TRIGGERS.map(({ trigger }) => {
        const found = byTrigger.get(trigger);
        if (found) return found;
        return {
          trigger,
          promotion_id: null,
          promotion_name: null,
          test_mode: true,
          notes: null,
          created_at: '',
          updated_at: '',
          is_mapped: false,
        };
      });
      // 시드되지 않은 비표준 trigger 까지 보존
      for (const r of data) {
        if (!merged.some((m) => m.trigger === r.trigger)) merged.push(r);
      }
      setRows(merged);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const unmappedCount = useMemo(() => rows.filter((r) => !r.is_mapped).length, [rows]);
  const testModeCount = useMemo(
    () => rows.filter((r) => r.is_mapped && r.test_mode).length,
    [rows]
  );

  function openEdit(row: TossPromotionRow) {
    setEdit({
      trigger: row.trigger,
      promotion_id: row.is_mapped ? row.promotion_id ?? '' : '',
      promotion_name: row.promotion_name ?? '',
      test_mode: row.test_mode,
      notes: row.notes ?? '',
      isExisting: !!row.created_at,
    });
  }

  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    if (!edit) return;
    if (!edit.promotion_id.trim()) {
      toast.error('promotion_id 를 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      await upsertTossPromotion({
        trigger: edit.trigger,
        promotion_id: edit.promotion_id.trim(),
        promotion_name: edit.promotion_name.trim() || null,
        test_mode: edit.test_mode,
        notes: edit.notes.trim() || null,
      });
      toast.success(`${tossTriggerLabel(edit.trigger)} 매핑 저장 완료`);
      setEdit(null);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleGoLiveOne() {
    if (!goLive) return;
    setSaving(true);
    try {
      await upsertTossPromotion({
        trigger: goLive.trigger,
        promotion_id: goLive.promotion_id ?? '',
        promotion_name: goLive.promotion_name,
        test_mode: false,
        notes: goLive.notes,
      });
      toast.success(`${tossTriggerLabel(goLive.trigger)} 운영 모드 전환`);
      setGoLive(null);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkGoLive() {
    setSubmittingBulk(true);
    try {
      const targets = rows.filter((r) => r.is_mapped && r.test_mode);
      for (const r of targets) {
        await upsertTossPromotion({
          trigger: r.trigger,
          promotion_id: r.promotion_id ?? '',
          promotion_name: r.promotion_name,
          test_mode: false,
          notes: r.notes,
        });
      }
      toast.success(`${targets.length}건 운영 모드 전환 완료`);
      setBulkLive(false);
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmittingBulk(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>토스 프로모션 매핑</h1>
          <div className="subtitle">
            trigger ↔ promotion_id 매핑 / test → 운영 전환
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="primary"
            disabled={testModeCount === 0 || loading}
            onClick={() => setBulkLive(true)}
            title="test_mode=true 인 모든 매핑을 운영(false)으로 전환"
          >
            모두 운영 전환 ({testModeCount})
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {unmappedCount > 0 && (
        <div
          className="error-banner"
          style={{
            background: '#fef3c7',
            color: '#92400e',
            borderColor: '#fbbf24',
          }}
        >
          ⚠️ 토스 프로모션 매핑 <strong>{unmappedCount}건</strong> 누락 — 해당 트리거의
          토스포인트 지급이 실패합니다.
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>트리거</th>
                <th>promotion_id</th>
                <th style={{ width: 110 }}>모드</th>
                <th style={{ width: 180 }}>최근 변경</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.trigger} onClick={() => openEdit(row)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{tossTriggerLabel(row.trigger)}</div>
                    <code style={{ fontSize: 11, color: 'var(--text-mute)' }}>
                      {row.trigger}
                    </code>
                  </td>
                  <td>
                    {row.is_mapped ? (
                      <code style={{ fontSize: 12 }}>{row.promotion_id}</code>
                    ) : (
                      <span className="badge blinded">⚠️ 미설정</span>
                    )}
                    {row.promotion_name && (
                      <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>
                        {row.promotion_name}
                      </div>
                    )}
                  </td>
                  <td>
                    {row.test_mode ? (
                      <span className="badge pending">test</span>
                    ) : (
                      <span className="badge active">운영</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                    {row.updated_at ? formatKst(row.updated_at) : '-'}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        style={{ fontSize: 12 }}
                        onClick={() => openEdit(row)}
                      >
                        편집
                      </button>
                      {row.is_mapped && row.test_mode && (
                        <button
                          className="primary"
                          style={{ fontSize: 12 }}
                          onClick={() => setGoLive({ ...row, _kind: 'one' })}
                          title="이 trigger 만 운영 모드로 전환"
                        >
                          운영 전환
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!edit}
        title={edit ? `매핑 편집 — ${tossTriggerLabel(edit.trigger)}` : ''}
        confirmLabel="저장"
        loading={saving}
        onCancel={() => setEdit(null)}
        onConfirm={handleSave}
      >
        {edit && (
          <form
            onSubmit={handleSave}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div>
              <label>trigger</label>
              <code
                style={{
                  fontSize: 12,
                  background: '#eef1f6',
                  padding: '4px 8px',
                  borderRadius: 4,
                  display: 'inline-block',
                }}
              >
                {edit.trigger}
              </code>
            </div>
            <div>
              <label htmlFor="promo-id">promotion_id (필수)</label>
              <input
                id="promo-id"
                value={edit.promotion_id}
                onChange={(e) =>
                  setEdit((p) => p && { ...p, promotion_id: e.target.value })
                }
                placeholder="PROMO_xxxx"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="promo-name">promotion_name (메모)</label>
              <input
                id="promo-name"
                value={edit.promotion_name}
                onChange={(e) =>
                  setEdit((p) => p && { ...p, promotion_name: e.target.value })
                }
                placeholder="토스 콘솔에 등록한 이름"
              />
            </div>
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 0,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={edit.test_mode}
                  onChange={(e) =>
                    setEdit((p) => p && { ...p, test_mode: e.target.checked })
                  }
                  style={{ width: 'auto' }}
                />
                test_mode (검수 통과 후 해제)
              </label>
            </div>
            <div>
              <label htmlFor="promo-notes">메모</label>
              <textarea
                id="promo-notes"
                value={edit.notes}
                onChange={(e) =>
                  setEdit((p) => p && { ...p, notes: e.target.value })
                }
                rows={2}
              />
            </div>
          </form>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!goLive}
        title="운영 모드 전환"
        description={
          goLive
            ? `${tossTriggerLabel(goLive.trigger)} 의 test_mode 를 해제합니다. 실 토스포인트 지급이 시작됩니다.`
            : ''
        }
        confirmLabel="운영 전환"
        variant="danger"
        loading={saving}
        onCancel={() => setGoLive(null)}
        onConfirm={handleGoLiveOne}
      />

      <ConfirmDialog
        open={bulkLive}
        title={`매핑 ${testModeCount}건 일괄 운영 전환`}
        description="현재 매핑되어 있는 모든 test_mode 항목의 test_mode 를 false 로 전환합니다. 실 토스포인트 지급이 시작됩니다."
        confirmLabel="모두 운영 전환"
        variant="danger"
        loading={submittingBulk}
        onCancel={() => setBulkLive(false)}
        onConfirm={handleBulkGoLive}
      />
    </div>
  );
}
