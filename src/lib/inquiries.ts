import { supabase } from '../config/supabase';
import type { InquiryRow, InquiryStatus } from './types';

export type InquiryStatusFilter = InquiryStatus | 'processed' | null;

export async function listInquiries(
  filter: InquiryStatusFilter,
  page = 0,
  pageSize = 50
): Promise<InquiryRow[]> {
  // RPC 는 단일 status 필터만 받음. '처리됨' 묶음은 두 번 호출해 합친다.
  if (filter === 'processed') {
    const [resolved, dismissed] = await Promise.all([
      callList('resolved', pageSize, page * pageSize),
      callList('dismissed', pageSize, page * pageSize),
    ]);
    return [...resolved, ...dismissed].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  return callList(filter, pageSize, page * pageSize);
}

async function callList(
  statusFilter: InquiryStatus | null,
  limit: number,
  offset: number
): Promise<InquiryRow[]> {
  const { data, error } = await supabase.rpc('admin_list_inquiries', {
    p_status_filter: statusFilter,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as InquiryRow[];
}

export async function resolveInquiry(
  id: string,
  status: 'resolved' | 'dismissed',
  note?: string
) {
  const trimmed = note?.trim() ?? '';
  const { data, error } = await supabase.rpc('admin_resolve_inquiry', {
    p_inquiry_id: id,
    p_status: status,
    p_admin_note: trimmed.length > 0 ? trimmed : null,
  });
  if (error) throw error;
  return data;
}

export async function deleteInquiry(id: string) {
  const { data, error } = await supabase.rpc('admin_delete_inquiry', {
    p_inquiry_id: id,
  });
  if (error) throw error;
  return data;
}
