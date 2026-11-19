import type { DayRecord } from '@mindwell/core';
import { CORE_TABLES, localDay } from '@mindwell/core';
import { getStore } from './db';
import { dueReminders, REMINDER_BODY } from './reminders';
import { settings } from './settings.svelte';

async function canNotify(): Promise<boolean> {
  return false; // Web Notifications in step 3
}

async function tick(): Promise<void> {
  if (!settings.loaded) return;
  const now = new Date();
  const store = await getStore();
  const [row] = await store.list<DayRecord>(CORE_TABLES.days, { where: { day: localDay(now) }, limit: 1 });
  const due = dueReminders(now, settings.reminderConfig, row ?? null, settings.sent);
  if (due.length === 0) return;
  if (!(await canNotify())) return;
  for (const kind of due) {
    new Notification('mindwell', { body: REMINDER_BODY[kind] });
    await settings.markSent(kind, localDay(now));
  }
}

/** Checks every 60 s for due reminders. Returns a stop function. */
export function startReminders(): () => void {
  const run = () => void tick().catch(() => {});
  run();
  const timer = setInterval(run, 60_000);
  return () => clearInterval(timer);
}
