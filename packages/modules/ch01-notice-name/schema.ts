import type { BaseRecord } from '@mindwell/core';

export interface StoryRecord extends BaseRecord {
  name: string;
  first_seen_day: string;
  /** 0 or 1 (SQLite has no boolean). */
  archived: number;
}

export interface CaptureRecord extends BaseRecord {
  text: string;
  story_id: string | null;
  intensity: number | null;
  /** ISO UTC instant. */
  captured_at: string;
  day: string;
}

export function validateCaptureText(value: string): boolean {
  const n = value.trim().length;
  return n >= 1 && n <= 280;
}

export function validateIntensity(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 5);
}

export function validateStoryName(value: string): boolean {
  const n = value.trim().length;
  return n >= 1 && n <= 60;
}
