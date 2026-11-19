import type { BaseRecord, NewRecord } from '@mindwell/core';

export interface ThoughtRecord extends BaseRecord {
  day: string;
  /** ch01 capture id, by reference only. */
  capture_id: string | null;
  story_id: string | null;
  situation: string;
  automatic_thought: string;
  feeling: string;
  intensity_before: number | null;
  evidence_for: string;
  evidence_against: string;
  /** 0 or 1 (SQLite has no boolean). */
  ps_permanent: number;
  /** 0 or 1. */
  ps_pervasive: number;
  /** 0 or 1. */
  ps_personal: number;
  balanced_thought: string;
  intensity_after: number | null;
  /** 0 or 1. Set when steps 2, 3 and 8 are filled. */
  complete: number;
}

export type ThoughtRecordFields = Omit<NewRecord<ThoughtRecord>, 'complete'>;

export type DraftPatch = Partial<
  Pick<
    ThoughtRecord,
    | 'situation'
    | 'automatic_thought'
    | 'feeling'
    | 'intensity_before'
    | 'evidence_for'
    | 'evidence_against'
    | 'ps_permanent'
    | 'ps_pervasive'
    | 'ps_personal'
    | 'balanced_thought'
    | 'intensity_after'
  >
>;

export function validateIntensity100(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 0 && value <= 100);
}

export function validateText(value: string, max = 2000): boolean {
  return value.length <= max;
}

export function validateFeeling(value: string): boolean {
  return value.length <= 40;
}

/** Steps 2, 3 and 8 filled. */
export function isComplete(
  r: Pick<ThoughtRecord, 'automatic_thought' | 'feeling' | 'intensity_before' | 'intensity_after'>,
): boolean {
  return (
    r.automatic_thought.trim().length > 0 &&
    r.feeling.trim().length > 0 &&
    r.intensity_before !== null &&
    r.intensity_after !== null
  );
}
