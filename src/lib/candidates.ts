import { supabase } from '../config/supabase';
import type { CandidateRow, CategoryKey } from './types';

export async function listCandidates(dateKst: string): Promise<CandidateRow[]> {
  const { data, error } = await supabase.rpc('admin_list_today_candidates', {
    p_date: dateKst,
  });
  if (error) throw error;
  const rows = (data ?? []) as CandidateRow[];

  if (rows.length === 0) return rows;

  const ids = rows.map((r) => r.id);
  const { data: options, error: optErr } = await supabase
    .from('vote_options')
    .select('vote_id, option_text, display_order')
    .in('vote_id', ids)
    .order('display_order', { ascending: true });
  if (optErr) throw optErr;

  const byVote = new Map<string, { option_text: string; display_order: number }[]>();
  for (const o of options ?? []) {
    const arr = byVote.get(o.vote_id) ?? [];
    arr.push({ option_text: o.option_text, display_order: o.display_order });
    byVote.set(o.vote_id, arr);
  }
  return rows.map((r) => ({ ...r, options: byVote.get(r.id) ?? [] }));
}

export async function publishToday(
  selections: Partial<Record<CategoryKey, string>>,
  publishDateKst: string
) {
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(selections)) {
    if (v) filtered[k] = v;
  }
  if (Object.keys(filtered).length === 0) {
    throw new Error('선택된 후보가 없습니다.');
  }
  const { data, error } = await supabase.rpc('promote_today_candidates', {
    p_selections: filtered,
    p_publish_date: publishDateKst,
  });
  if (error) throw error;
  return data;
}

export async function listTodayPublished(publishDateKst: string) {
  const { data, error } = await supabase
    .from('votes')
    .select('id, question, category, participants_count, author_id, created_at')
    .eq('type', 'today')
    .gte('created_at', `${publishDateKst}T00:00:00+09:00`)
    .lt(
      'created_at',
      `${shiftDate(publishDateKst, 1)}T00:00:00+09:00`
    );
  if (error) throw error;
  return data ?? [];
}

function shiftDate(yyyyMmDd: string, days: number): string {
  const d = new Date(`${yyyyMmDd}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
