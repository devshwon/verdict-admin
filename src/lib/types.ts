export type CategoryKey = 'daily' | 'relationship' | 'work' | 'game';

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  daily: '일상',
  relationship: '연애',
  work: '직장',
  game: '게임',
};

export const CATEGORY_KEYS: CategoryKey[] = ['daily', 'relationship', 'work', 'game'];

export type VoteStatus =
  | 'active'
  | 'pending_review'
  | 'closed'
  | 'blinded'
  | 'blinded_by_reports'
  | 'deleted';

export const VOTE_STATUS_OPTIONS: { value: VoteStatus; label: string }[] = [
  { value: 'active', label: 'active' },
  { value: 'pending_review', label: 'pending_review' },
  { value: 'closed', label: 'closed' },
  { value: 'blinded', label: 'blinded' },
  { value: 'blinded_by_reports', label: 'blinded_by_reports' },
  { value: 'deleted', label: 'deleted' },
];

export interface VoteRow {
  id: string;
  question: string;
  category: CategoryKey | string;
  status: VoteStatus | string;
  type?: string | null;
  participants_count?: number | null;
  reports_count?: number | null;
  created_at: string;
  author_id?: string | null;
}

export interface VoteOption {
  id: string;
  vote_id: string;
  option_text: string;
  display_order: number;
}

export interface ReportedVoteRow {
  id: string;
  question: string;
  category: string;
  status: string;
  reports_count: number;
  last_reported_at: string;
  created_at: string;
}

export interface VoteReport {
  id: string;
  vote_id: string;
  reason: string;
  reporter_short: string;
  created_at: string;
}

export type InquiryStatus = 'open' | 'resolved' | 'dismissed';

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  open: '미처리',
  resolved: '처리 완료',
  dismissed: '기각',
};

export interface InquiryRow {
  id: string;
  user_short: string;
  nickname: string | null;
  message: string;
  status: InquiryStatus;
  admin_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface CandidateRow {
  id: string;
  question: string;
  category: CategoryKey | string;
  status: string;
  ai_score?: number | null;
  author_id?: string | null;
  created_at: string;
  options?: { option_text: string; display_order: number }[] | null;
}
