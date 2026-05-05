import { supabase } from '../config/supabase';
import type { UserSearchRow } from './types';

export interface FindUserOpts {
  email?: string;
  short?: string;
}

export async function findUser(opts: FindUserOpts): Promise<UserSearchRow[]> {
  const email = opts.email?.trim() || null;
  const short = opts.short?.trim() || null;
  if (!email && !short) return [];
  const { data, error } = await supabase.rpc('admin_find_user', {
    p_email: email,
    p_short: short,
  });
  if (error) throw error;
  return (data ?? []) as UserSearchRow[];
}

export async function unblockUser(userId: string) {
  const { data, error } = await supabase.rpc('admin_unblock_user', {
    p_user_id: userId,
  });
  if (error) throw error;
  return data;
}

export function isCurrentlyBlocked(row: UserSearchRow): boolean {
  if (!row.register_blocked_until) return false;
  return new Date(row.register_blocked_until).getTime() > Date.now();
}
