import { supabase } from '../config/supabase';
import type { CategoryKey } from './types';

export type NormalCategoryKey = CategoryKey | 'etc';

export const NORMAL_CATEGORY_KEYS: NormalCategoryKey[] = [
  'daily',
  'relationship',
  'work',
  'game',
  'etc',
];

export const NORMAL_CATEGORY_LABEL: Record<NormalCategoryKey, string> = {
  daily: '일상',
  relationship: '연애',
  work: '직장',
  game: '게임',
  etc: '기타',
};

export const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: '5분' },
  { value: 10, label: '10분' },
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
];

export const DEFAULT_DURATION_MINUTES = 60;

export interface GeneratedTopic {
  question: string;
  options: string[];
}

export interface GeneratedTopicsResponse {
  items: GeneratedTopic[];
  prompt_version?: string | null;
}

export interface GeneratedTodayCandidate {
  question: string;
  options: string[];
  prompt_version?: string | null;
}

export async function generateNormalVoteTopics(
  category: NormalCategoryKey,
  count: number,
  exclude: string[]
): Promise<GeneratedTopicsResponse> {
  const { data, error } = await supabase.functions.invoke('admin-generate-vote-topics', {
    body: { category, count, exclude_questions: exclude },
  });
  if (error) throw error;
  const payload = data as GeneratedTopicsResponse | null;
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error('AI 응답 형식이 올바르지 않습니다.');
  }
  return payload;
}

export interface CreateNormalVoteInput {
  question: string;
  options: string[];
  category: NormalCategoryKey;
  duration_minutes: number;
}

export async function createNormalVote(input: CreateNormalVoteInput): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_normal_vote', {
    p_question: input.question,
    p_options: input.options,
    p_category: input.category,
    p_duration_minutes: input.duration_minutes,
  });
  if (error) throw error;
  return data as string;
}

export async function generateTodayCandidate(
  category: CategoryKey
): Promise<GeneratedTodayCandidate> {
  const { data, error } = await supabase.functions.invoke(
    'admin-generate-today-candidate',
    { body: { category } }
  );
  if (error) throw error;
  const payload = data as GeneratedTodayCandidate | null;
  if (!payload || typeof payload.question !== 'string' || !Array.isArray(payload.options)) {
    throw new Error('AI 응답 형식이 올바르지 않습니다.');
  }
  return payload;
}

export interface CreateTodayVoteInput {
  question: string;
  options: string[];
  category: CategoryKey;
  publish_date: string;
}

export async function createTodayVote(input: CreateTodayVoteInput): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_today_vote', {
    p_question: input.question,
    p_options: input.options,
    p_category: input.category,
    p_publish_date: input.publish_date,
  });
  if (error) throw error;
  return data as string;
}
