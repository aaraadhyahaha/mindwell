import type { ModuleReminder } from './module';

export interface ReminderPick {
  /** The one reminder to show now, or null. */
  show: ModuleReminder | null;
  /** Keys to record as sent: the shown one plus any older pending ones it replaces. */
  markSent: string[];
}

/**
 * Which module reminder to show now. Pending = `at <= now < until` and not yet sent.
 * Shows only the latest pending one (by `at`, then key) and marks every pending one sent,
 * so a return to the tab after a gap shows one notification, not a burst. Pure.
 */
export function pickReminder(now: string, reminders: readonly ModuleReminder[], sent: ReadonlySet<string>): ReminderPick {
  const t = Date.parse(now);
  const pending = reminders
    .filter((r) => !sent.has(r.key) && Date.parse(r.at) <= t && t < Date.parse(r.until))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return { show: pending.at(-1) ?? null, markSent: pending.map((r) => r.key) };
}

/** Sent keys worth keeping: those still listed by a module (the rest can never fire again). Pure. */
export function pruneSent(sent: readonly string[], reminders: readonly ModuleReminder[]): string[] {
  const live = new Set(reminders.map((r) => r.key));
  return sent.filter((k) => live.has(k));
}
