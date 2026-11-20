import type { DayRecord, ModuleReminder } from '@mindwell/core';
import { CORE_TABLES, localDay, pickReminder, pruneSent } from '@mindwell/core';
import { activation } from './activation.svelte';
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
  await notify('mindwell', REMINDER_BODY[kind], 'mindwell-' + kind);
}

async function notify(title: string, body: string, tag: string): Promise<void> {
  const options = { body, tag, icon: '/icons/icon-192.png' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
    const n = new Notification(title, options);
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

/** Every active module's reminders. A def whose compute throws is skipped and `complete` is false (then nothing is pruned). */
async function moduleReminders(now: Date): Promise<{ list: ModuleReminder[]; complete: boolean }> {
  const store = await getStore();
  const ctx = { store, now: now.toISOString(), day: localDay(now), morning: settings.morning };
  const list: ModuleReminder[] = [];
  let complete = true;
  for (const m of activation.active) {
    for (const def of m.reminders ?? []) {
      try {
        list.push(...(await def.compute(ctx)));
      } catch {
        complete = false;
      }
    }
  }
  return { list, complete };
}

/** Shows at most one due module reminder (the latest) and records the pending ones as sent. */
async function moduleTick(): Promise<void> {
  if (!settings.loaded || !activation.loaded || !canNotify()) return;
  const now = new Date();
  const { list, complete } = await moduleReminders(now);
  const pick = pickReminder(now.toISOString(), list, new Set(settings.moduleSent));
  const kept = complete ? pruneSent(settings.moduleSent, list) : settings.moduleSent;
  const next = [...kept, ...pick.markSent.filter((k) => !kept.includes(k))];
  if (pick.show) await notify(pick.show.title, pick.show.body, 'mindwell-' + pick.show.key);
  if (next.length !== settings.moduleSent.length || next.some((k, i) => k !== settings.moduleSent[i])) {
    await settings.setModuleSent(next);
  }
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
  const run = () => {
    queue(tick);
    queue(moduleTick);
  };
  const catchUpRun = () => {
    queue(catchUp);
    queue(moduleTick);
  };
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
