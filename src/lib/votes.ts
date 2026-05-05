import { supabase } from '../config/supabase';
import type { VoteOption, VoteRow, VoteStatus } from './types';

export interface ListVotesFilter {
  category?: string | null;
  status?: VoteStatus[] | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export async function listVotes(filter: ListVotesFilter): Promise<VoteRow[]> {
  const pageSize = filter.pageSize ?? 50;
  const page = filter.page ?? 0;
  const { data, error } = await supabase.rpc('admin_list_votes', {
    p_category: filter.category ?? null,
    p_status: filter.status && filter.status.length > 0 ? filter.status : null,
    p_search: filter.search?.trim() ? filter.search.trim() : null,
    p_limit: pageSize,
    p_offset: page * pageSize,
  });
  if (error) throw error;
  return (data ?? []) as VoteRow[];
}

export async function softDeleteVote(voteId: string, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error('반려 사유는 필수입니다.');
  }
  const { data, error } = await supabase.rpc('admin_soft_delete_vote', {
    p_vote_id: voteId,
    p_reason: trimmed,
  });
  if (error) throw error;
  return data;
}

export async function listVoteOptions(voteId: string): Promise<VoteOption[]> {
  const { data, error } = await supabase
    .from('vote_options')
    .select('id, vote_id, option_text, display_order')
    .eq('vote_id', voteId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VoteOption[];
}
