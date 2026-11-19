import type { DayRecord } from '@mindwell/core';
import { CORE_TABLES, localDay } from '@mindwell/core';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { getStore } from './db';
import { dueReminders, REMINDER_BODY } from './reminders';
import { settings } from './settings.svelte';

const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let permission: boolean | null = null;

async function canNotify(): Promise<boolean> {
  if (permission !== null) return permission;
  let ok = await isPermissionGranted();
  if (!ok) ok = (await requestPermission()) === 'granted';
  permission = ok;
  return ok;
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
    sendNotification({ title: 'mindwell', body: REMINDER_BODY[kind] });
    await settings.markSent(kind, localDay(now));
  }
}

/** Checks every 60 s for due reminders. No-op outside Tauri. Returns a stop function. */
export function startReminders(): () => void {
  if (!inTauri()) return () => {};
  const run = () => void tick().catch(() => {});
  run();
  const timer = setInterval(run, 60_000);
  return () => clearInterval(timer);
}
