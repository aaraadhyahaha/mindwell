import type { BaseRecord } from './store';

/** Core tables (owner `core`, unprefixed). Columns match `coreMigrations`. */
export const CORE_TABLES = {
  days: 'days',
  promptsShown: 'prompts_shown',
  promptScores: 'prompt_scores',
  chapters: 'chapters',
  suggestions: 'suggestions',
  settings: 'settings',
} as const;

export const DAY_TYPES = ['exam', 'heavy_study', 'stressful_event', 'social', 'light', 'busy_travel'] as const;
export type DayType = (typeof DAY_TYPES)[number];

export type IntentResult = 'kept' | 'partly' | 'not';

/** One row per local day (unique among live rows). */
export interface DayRecord extends BaseRecord {
  /** `YYYY-MM-DD`, 04:00 boundary. */
  day: string;
  /** JSON array of DayType. */
  types: string;
  /** 1–5. */
  energy: number | null;
  intent_prompt_id: string | null;
  intent_text: string | null;
  intent_result: IntentResult | null;
  /** 1–5, set at evening close. */
  rating: number | null;
  /** ISO UTC, when the morning check-in was finished. */
  checkin_at: string | null;
  /** ISO UTC, when the evening close was finished. */
  closed_at: string | null;
}

export type PromptSlot = 'morning' | 'evening';
export type PromptFeedback = 'useful' | 'not_useful';

/** Every prompt put on screen, including ones swapped out with "show another". */
export interface PromptShownRecord extends BaseRecord {
  day: string;
  slot: PromptSlot;
  prompt_id: string;
  module: string;
  kind: 'intent' | 'journal';
  technique: string;
  /** Text as shown, placeholders filled. */
  text: string;
  /** Order on screen within the slot (0-based). */
  position: number;
  /** 1 if swapped out with "show another", else 0. */
  replaced: number;
  feedback: PromptFeedback | null;
}

/** Feedback totals per prompt (unique `prompt_id` among live rows). */
export interface PromptScoreRecord extends BaseRecord {
  prompt_id: string;
  rated: number;
  useful: number;
}

/** A chapter marked read in the Library (unique `chapter` among live rows). Unmarking soft-deletes it. */
export interface ChapterRecord extends BaseRecord {
  /** Introduction = 0. */
  chapter: number;
  /** Local day it was marked read. */
  read_day: string;
}

export type SuggestionStatus = 'open' | 'accepted' | 'dismissed';

export interface SuggestionRecord extends BaseRecord {
  rule_id: string;
  module: string;
  /** `Suggestion.key`; a dismissed key is not offered again. */
  key: string;
  text: string;
  reason: string;
  /** Local day of the weekly review that produced it. */
  day: string;
  status: SuggestionStatus;
  decided_at: string | null;
}

/** Key/value settings (unique `key` among live rows). `value` is JSON. */
export interface SettingRecord extends BaseRecord {
  key: string;
  value: string;
}
