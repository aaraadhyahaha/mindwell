import type { BaseRecord, ModuleReminder, ReminderDef } from '@mindwell/core';
import { clock } from './signals';

export interface ReminderEvent {
  id: string;
  title: string;
  starts_at: string;
  day: string;
  /** Last edit: a reminder whose time had already passed then is skipped (no instant ping on adding a near event). */
  updated_at: string;
}

/** The 60-minute-before reminder. */
export const PRE_EVENT_MIN = 60;
export const REAPPRAISAL_BODY = "Your body is getting ready to perform. Say: I'm excited.";

/** `HH:MM` on local `day` as an ISO timestamp, or null if malformed. */
function atLocal(day: string, hhmm: string): string | null {
  const t = /^(\d{2}):(\d{2})$/.exec(hhmm);
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!t || !d) return null;
  return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2])).toISOString();
}

/**
 * Notifications for upcoming events: the morning of (at the user's check-in time,
 * only when that is before the 60-min one) and 60 min before. Every one ends at the
 * event's start, so nothing fires for a past event. Pure.
 */
export function eventReminders(events: readonly ReminderEvent[], now: string, morning: string): ModuleReminder[] {
  const t = Date.parse(now);
  const out: ModuleReminder[] = [];
  for (const e of events) {
    const start = Date.parse(e.starts_at);
    if (!(start > t)) continue;
    const edited = Date.parse(e.updated_at);
    const pre = start - PRE_EVENT_MIN * 60_000;
    const base = `ch03.event:${e.id}:${e.starts_at}`;
    const m = atLocal(e.day, morning);
    if (m !== null && Date.parse(m) < pre && Date.parse(m) >= edited) {
      out.push({ key: `${base}:morning`, at: m, until: e.starts_at, title: `Today: ${e.title} at ${clock(e.starts_at)}`, body: REAPPRAISAL_BODY });
    }
    if (pre >= edited) {
      out.push({ key: `${base}:pre`, at: new Date(pre).toISOString(), until: e.starts_at, title: `${e.title} in an hour`, body: REAPPRAISAL_BODY });
    }
  }
  return out;
}

export const reminders: ReminderDef[] = [
  {
    id: 'ch03.events',
    async compute({ store, now, morning }) {
      const rows = await store.list<ReminderEvent & BaseRecord>('ch03_events');
      return eventReminders(rows, now, morning);
    },
  },
];
