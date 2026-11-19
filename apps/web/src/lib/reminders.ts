import type { DayRecord } from '@mindwell/core';
import { DAY_BOUNDARY_HOUR, localDay } from '@mindwell/core';

export type ReminderKind = 'morning' | 'evening';

export interface ReminderConfig {
  morning: string;
  morningOn: boolean;
  evening: string;
  eveningOn: boolean;
}

export type ReminderSent = Record<ReminderKind, string | null>;

/** How long after the set time a reminder may still fire. */
export const REMINDER_WINDOW_MIN = 60;

export const REMINDER_BODY: Record<ReminderKind, string> = {
  morning: "Morning check-in: a few minutes to set today's intent.",
  evening: 'Evening close: a few minutes to look back on today.',
};

const DAY_START_MIN = DAY_BOUNDARY_HOUR * 60;

/** Minutes since the 04:00 day start, so 23:45 < 00:15 < 03:59 within one day. */
function sinceDayStart(minutesOfDay: number): number {
  return (minutesOfDay - DAY_START_MIN + 1440) % 1440;
}

function parseTime(t: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** Which reminders should fire now. Pure. Window is [time, time + 60 min). */
export function dueReminders(
  now: Date,
  cfg: ReminderConfig,
  today: Pick<DayRecord, 'checkin_at' | 'closed_at'> | null,
  sent: ReminderSent,
): ReminderKind[] {
  const day = localDay(now);
  const current = sinceDayStart(now.getHours() * 60 + now.getMinutes());
  const check = (kind: ReminderKind, time: string, on: boolean, done: boolean): boolean => {
    if (!on || done || sent[kind] === day) return false;
    const at = parseTime(time);
    if (at === null) return false;
    const elapsed = current - sinceDayStart(at);
    return elapsed >= 0 && elapsed < REMINDER_WINDOW_MIN;
  };
  const out: ReminderKind[] = [];
  if (check('morning', cfg.morning, cfg.morningOn, !!today?.checkin_at)) out.push('morning');
  if (check('evening', cfg.evening, cfg.eveningOn, !!today?.closed_at)) out.push('evening');
  return out;
}

/**
 * Catch-up: one notification for a reminder missed earlier today (laptop asleep, tab closed).
 * Returns the latest such kind (evening over morning), else null. Pure.
 */
export function catchUpReminder(
  now: Date,
  cfg: ReminderConfig,
  today: Pick<DayRecord, 'checkin_at' | 'closed_at'> | null,
  sent: ReminderSent,
): ReminderKind | null {
  const day = localDay(now);
  const current = sinceDayStart(now.getHours() * 60 + now.getMinutes());
  const missed = (kind: ReminderKind, time: string, on: boolean, done: boolean): boolean => {
    if (!on || done || sent[kind] === day) return false;
    const at = parseTime(time);
    return at !== null && current - sinceDayStart(at) >= 0;
  };
  if (missed('evening', cfg.evening, cfg.eveningOn, !!today?.closed_at)) return 'evening';
  if (missed('morning', cfg.morning, cfg.morningOn, !!today?.checkin_at)) return 'morning';
  return null;
}
