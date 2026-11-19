import type { DayRecord } from '@mindwell/core';
import { CORE_TABLES, localDay } from '@mindwell/core';
import { getStore } from './db';
import { catchUpReminder, dueReminders, REMINDER_BODY } from './reminders';
import type { ReminderKind } from './reminders';
import { settings } from './settings.svelte';

function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

/** Must be called from a user gesture (a button press). */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

async function show(kind: ReminderKind): Promise<void> {
  const options = { body: REMINDER_BODY[kind], tag: 'mindwell-' + kind, icon: '/icons/icon-192.png' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification('mindwell', options);
      return;
    }
    const n = new Notification('mindwell', options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Notifications are best-effort.
  }
}

async function todayRow(now: Date): Promise<DayRecord | null> {
  const store = await getStore();
  const [row] = await store.list<DayRecord>(CORE_TABLES.days, { where: { day: localDay(now) }, limit: 1 });
  return row ?? null;
}

async function tick(): Promise<void> {
  if (!settings.loaded || !canNotify()) return;
  const now = new Date();
  const due = dueReminders(now, settings.reminderConfig, await todayRow(now), settings.sent);
  for (const kind of due) {
    await show(kind);
    await settings.markSent(kind, localDay(now));
  }
}

async function catchUp(): Promise<void> {
  if (!settings.loaded || !canNotify()) return;
  const now = new Date();
  const day = localDay(now);
  const kind = catchUpReminder(now, settings.reminderConfig, await todayRow(now), settings.sent);
  if (!kind) return;
  await show(kind);
  await settings.markSent(kind, day);
  // Evening caught up: do not announce the earlier morning one later.
  if (kind === 'evening' && settings.sent.morning !== day) await settings.markSent('morning', day);
}

/** Checks every 60 s for due reminders, and once a day on return to the tab. Returns a stop function. */
export function startReminders(): () => void {
  // One at a time: the tick and a catch-up must not both see a reminder as unsent.
  let chain: Promise<void> = Promise.resolve();
  const queue = (task: () => Promise<void>) => {
    chain = chain.then(task).catch(() => {});
  };
  const run = () => queue(tick);
  const catchUpRun = () => queue(catchUp);
  const onVisible = () => {
    if (document.visibilityState === 'visible') catchUpRun();
  };
  run();
  catchUpRun();
  const timer = setInterval(run, 60_000);
  window.addEventListener('focus', catchUpRun);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(timer);
    window.removeEventListener('focus', catchUpRun);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
