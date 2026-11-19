import type { BaseRecord } from '@mindwell/core';

export type Status = 'active' | 'ended';
export type Verdict = 'keep' | 'drop' | 'extend';

export interface ExperimentRecord extends BaseRecord {
  module: string;
  technique: string;
  /** The technique's label, copied at start. */
  label: string;
  hypothesis: string;
  start_day: string;
  end_day: string;
  status: Status;
  verdict: Verdict | null;
  note: string | null;
}

export interface CheckinRecord extends BaseRecord {
  experiment_id: string;
  day: string;
  rating: number;
  note: string | null;
}

export const MAX_ACTIVE = 3;
export const DEFAULT_LENGTH = 21;

export const LIMIT_MESSAGE =
  'Three experiments are running. End one first: with fewer at once, each result is easier to read.';

export function validateHypothesis(value: string): boolean {
  const n = value.trim().length;
  return n >= 1 && n <= 200;
}

export function validateLength(days: number): boolean {
  return Number.isInteger(days) && days >= 1 && days <= 120;
}

export function validateRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}
