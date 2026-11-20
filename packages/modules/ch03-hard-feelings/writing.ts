import { SESSION_MINUTES, type Session } from './schema';

export type SeriesStep = 'mood_before' | 'timer' | 'mood_after' | 'done_today';

const SESSION_MS = SESSION_MINUTES * 60_000;

/** Milliseconds left of the timer; never below 0, never above the full length. */
export function remainingMs(createdAt: string, now: number): number {
  const left = Date.parse(createdAt) + SESSION_MS - now;
  return Math.min(SESSION_MS, Math.max(0, left));
}

/** Whole minutes elapsed since the session started, from 1 to SESSION_MINUTES. */
export function elapsedMinutes(createdAt: string, now: number): number {
  const whole = Math.floor((now - Date.parse(createdAt)) / 60_000);
  return Math.min(SESSION_MINUTES, Math.max(1, whole));
}

/** "mm:ss". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** The series day about to be written: finished sessions + 1, capped at the planned days. */
export function nextDay(sessions: Session[], planned: number): number {
  const finished = sessions.filter((s) => s.mood_after !== null).length;
  return Math.min(planned, finished + 1);
}

/**
 * Where today's session stands. An open session is 'timer'; the screen decides
 * between 'timer' and 'mood_after' by whether the time is up.
 */
export function seriesStep(sessions: Session[], day: string): SeriesStep {
  if (sessions.some((s) => s.mood_after === null)) return 'timer';
  if (sessions.some((s) => s.day === day)) return 'done_today';
  return 'mood_before';
}
