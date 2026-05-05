import { supabase } from '../config/supabase';
import type { ReportedVoteRow, VoteReport } from './types';

export async function listReportedVotes(
  onlyPending = true,
  page = 0,
  pageSize = 50
): Promise<ReportedVoteRow[]> {
  const { data, error } = await supabase.rpc('admin_list_reported_votes', {
    p_only_pending: onlyPending,
    p_limit: pageSize,
    p_offset: page * pageSize,
  });
  if (error) throw error;
  return (data ?? []) as ReportedVoteRow[];
}

export async function getVoteReports(voteId: string): Promise<VoteReport[]> {
  const { data, error } = await supabase.rpc('admin_get_vote_reports', {
    p_vote_id: voteId,
  });
  if (error) throw error;
  return (data ?? []) as VoteReport[];
}

export async function restoreVote(voteId: string, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error('처리 사유는 필수입니다.');
  }
  const { data, error } = await supabase.rpc('admin_restore_vote', {
    p_vote_id: voteId,
    p_reason: trimmed,
  });
  if (error) throw error;
  return data;
}
