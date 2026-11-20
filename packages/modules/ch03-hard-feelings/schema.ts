import type { BaseRecord } from '@mindwell/core';

export type ReframeHelped = 'yes' | 'a_bit' | 'no';
export type SeriesStatus = 'active' | 'finished' | 'stopped';

export interface Defusion extends BaseRecord {
  /** ch01 capture id, by reference only. */
  capture_id: string | null;
  thought_text: string;
  day: string;
}

export interface StressEvent extends BaseRecord {
  title: string;
  /** ISO 8601 UTC. */
  starts_at: string;
  day: string;
  reframe_helped: ReframeHelped | null;
  /** 1-5, null until rated. */
  outcome_rating: number | null;
}

export interface Series extends BaseRecord {
  /** A short label, never journal text. */
  topic: string;
  planned_days: 3 | 4;
  start_day: string;
  status: SeriesStatus;
}

/** Deliberately no text field: the writing happens in the paper journal. */
export interface Session extends BaseRecord {
  series_id: string;
  day: string;
  minutes: number;
  mood_before: number;
  mood_after: number | null;
}

/** One live row = done that day. */
export interface Gratitude extends BaseRecord {
  day: string;
}

export const SESSION_MINUTES = 15;

export const SERIES_PROMPTS: readonly string[] = [
  'Write about what happened and how it felt.',
  'Write about why it affects you the way it does.',
  'Write about what it might mean for you going forward.',
  "Write about what you've learned, or what you'd tell someone else in it.",
];

export function validateTopic(value: string): boolean {
  const n = value.trim().length;
  return n >= 1 && n <= 60;
}

export function validateThoughtText(value: string): boolean {
  const n = value.trim().length;
  return n >= 1 && n <= 280;
}

export function validateTitle(value: string): boolean {
  const n = value.trim().length;
  return n >= 1 && n <= 120;
}

export function validateRating5(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function validateReframeHelped(value: string): value is ReframeHelped {
  return value === 'yes' || value === 'a_bit' || value === 'no';
}

export function validatePlannedDays(value: number): value is 3 | 4 {
  return value === 3 || value === 4;
}

export function validateMinutes(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 240;
}

export function validateDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateTimestamp(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}
