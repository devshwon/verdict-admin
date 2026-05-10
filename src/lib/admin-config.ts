import { supabase } from '../config/supabase';

export type SettingCategory =
  | 'toss'
  | 'payout'
  | 'moderation'
  | 'ad'
  | 'prompt'
  | 'system';

export type SettingValueType = 'text' | 'int' | 'bool' | 'jsonb';

export type SettingRiskLevel = 'low' | 'medium' | 'high';

export interface SettingRow {
  key: string;
  value: unknown;
  category: SettingCategory;
  value_type: SettingValueType;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  risk_level: SettingRiskLevel;
  updated_at: string;
  updated_by: string | null;
  updated_by_email: string | null;
}

export interface TossPromotionRow {
  trigger: string;
  promotion_id: string | null;
  promotion_name: string | null;
  test_mode: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_mapped: boolean;
}

export interface UserAdminRow {
  id: string;
  user_short: string;
  email: string | null;
  created_at: string;
  is_admin: boolean;
  is_system: boolean;
  register_blocked_until: string | null;
  consecutive_rejections: number;
  daily_rejection_count: number;
  daily_rejection_date: string | null;
  register_count: number;
  cast_count: number;
  total_count: number;
}

export type AuditAction =
  | 'setting_change'
  | 'toss_promotion_change'
  | 'unblock_user'
  | 'grant_admin'
  | 'revoke_admin'
  | 'reset_user_data';

export interface AuditLogRow {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: AuditAction;
  target_key: string | null;
  prev_value: unknown;
  new_value: unknown;
  reason: string | null;
  created_at: string;
}

export interface CronJobStatus {
  jobname: string;
  schedule: string;
  last_run_at: string | null;
  last_status: string | null;
  recent_failure_count: number;
}

export interface SystemStatus {
  payout_dry_run: boolean;
  cron_jobs: CronJobStatus[];
  openai_today: {
    topic_gen_today: number;
  };
  fetched_at: string;
}

// Toss 프로모션
export async function listTossPromotions(): Promise<TossPromotionRow[]> {
  const { data, error } = await supabase.rpc('admin_list_toss_promotions');
  if (error) throw error;
  return (data ?? []) as TossPromotionRow[];
}

export async function upsertTossPromotion(params: {
  trigger: string;
  promotion_id: string;
  promotion_name?: string | null;
  test_mode?: boolean;
  notes?: string | null;
}) {
  const { error } = await supabase.rpc('admin_upsert_toss_promotion', {
    p_trigger: params.trigger,
    p_promotion_id: params.promotion_id,
    p_promotion_name: params.promotion_name ?? null,
    p_test_mode: params.test_mode ?? true,
    p_notes: params.notes ?? null,
  });
  if (error) throw error;
}

// 통합 설정
export async function getSettings(category?: SettingCategory): Promise<SettingRow[]> {
  const { data, error } = await supabase.rpc('admin_get_settings', {
    p_category: category ?? null,
  });
  if (error) throw error;
  return (data ?? []) as SettingRow[];
}

export async function setSetting(
  key: string,
  value: unknown,
  reason?: string | null
) {
  const { error } = await supabase.rpc('admin_set_setting', {
    p_key: key,
    p_value: value,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

// 시스템 상태 — 일부 필드 누락 가능성 있어 호출 측에서 normalize
export async function getSystemStatus(): Promise<unknown> {
  const { data, error } = await supabase.rpc('admin_get_system_status');
  if (error) throw error;
  return data;
}

// 사용자 관리
export async function listUsers(params: {
  tab: 'all' | 'blocked' | 'admin';
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<UserAdminRow[]> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_tab: params.tab,
    p_search: params.search?.trim() ? params.search.trim() : null,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as UserAdminRow[];
}

export async function unblockUser(userId: string) {
  const { error } = await supabase.rpc('admin_unblock_user', { p_user_id: userId });
  if (error) throw error;
}

export interface ResetUserDataResult {
  ok: boolean;
  deleted: {
    votes: number;
    vote_casts: number;
    today_candidate_recommendations: number;
    vote_reports: number;
    reports: number;
    inquiries: number;
    vote_unlocks: number;
    ad_watches: number;
    free_pass_grants: number;
    points_log: number;
  };
  reset_columns: string[];
}

export async function resetUserData(
  userId: string,
  reason: string
): Promise<ResetUserDataResult> {
  const { data, error } = await supabase.rpc('admin_reset_user_data', {
    p_user_id: userId,
    p_reason: reason,
  });
  if (error) throw error;
  return data as ResetUserDataResult;
}

export async function grantAdmin(targetUserId: string, reason: string) {
  const { error } = await supabase.rpc('admin_grant_admin', {
    p_target_user_id: targetUserId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function revokeAdmin(targetUserId: string, reason: string) {
  const { error } = await supabase.rpc('admin_revoke_admin', {
    p_target_user_id: targetUserId,
    p_reason: reason,
  });
  if (error) throw error;
}

// 감사 로그
export async function getAuditLog(params: {
  target_key?: string | null;
  action?: AuditAction | null;
  limit?: number;
  offset?: number;
}): Promise<AuditLogRow[]> {
  const { data, error } = await supabase.rpc('admin_get_audit_log', {
    p_target_key: params.target_key ?? null,
    p_action: params.action ?? null,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as AuditLogRow[];
}

export function isCurrentlyBlocked(row: {
  register_blocked_until: string | null;
}): boolean {
  if (!row.register_blocked_until) return false;
  return new Date(row.register_blocked_until).getTime() > Date.now();
}

export const TOSS_TRIGGERS: { trigger: string; label: string }[] = [
  { trigger: 'normal_vote_participation', label: '투표 참여' },
  { trigger: 'normal_daily_5vote_complete', label: '일일 5투표 완료' },
  { trigger: 'normal_daily_attendance', label: '일일 출석' },
  { trigger: 'normal_streak_10day', label: '10일 연속 출석' },
  { trigger: 'normal_streak_20day', label: '20일 연속 출석' },
  { trigger: 'normal_streak_30plus', label: '30일+ 연속 출석' },
  { trigger: 'normal_vote_register', label: '일반 투표 등록' },
  { trigger: 'today_candidate_register', label: '오늘 후보 등록' },
  { trigger: 'today_selection', label: '오늘 후보 선정' },
  { trigger: 'normal_100_participants_bonus', label: '100명 참여 보너스' },
];

export function tossTriggerLabel(trigger: string): string {
  return TOSS_TRIGGERS.find((t) => t.trigger === trigger)?.label ?? trigger;
}
