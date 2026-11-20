import { localDay } from '@mindwell/core';
import type { Store } from '@mindwell/core';
import {
  validateDay,
  validateMinutes,
  validatePlannedDays,
  validateRating5,
  validateReframeHelped,
  validateThoughtText,
  validateTimestamp,
  validateTitle,
  validateTopic,
} from './schema';
import type { Defusion, Gratitude, ReframeHelped, Series, Session, StressEvent } from './schema';

const DEFUSIONS = 'ch03_defusions';
const EVENTS = 'ch03_events';
const SERIES = 'ch03_series';
const SESSIONS = 'ch03_sessions';
const GRATITUDE = 'ch03_gratitude';

function requireDay(day: string): void {
  if (!validateDay(day)) throw new Error('A day must look like 2026-11-10.');
}

function requireStart(startsAt: string): string {
  if (!validateTimestamp(startsAt)) throw new Error('The event time is not a valid date.');
  return localDay(new Date(startsAt));
}

function between<T extends { day: string }>(rows: T[], from: string, to: string): T[] {
  return rows.filter((r) => r.day >= from && r.day <= to);
}

// Defusions

export async function addDefusion(
  store: Store,
  input: { capture_id?: string | null; thought_text: string; day: string },
): Promise<Defusion> {
  if (!validateThoughtText(input.thought_text)) throw new Error('A thought must be 1 to 280 characters.');
  requireDay(input.day);
  return store.insert<Defusion>(DEFUSIONS, {
    capture_id: input.capture_id ?? null,
    thought_text: input.thought_text.trim(),
    day: input.day,
  });
}

/** Newest first. */
export function listDefusions(store: Store, limit?: number): Promise<Defusion[]> {
  return store.list<Defusion>(DEFUSIONS, { orderBy: { column: 'created_at', direction: 'desc' }, limit });
}

/** fromDay <= day <= toDay, oldest first. */
export async function defusionsBetween(store: Store, from: string, to: string): Promise<Defusion[]> {
  return between(await store.list<Defusion>(DEFUSIONS, { orderBy: { column: 'created_at' } }), from, to);
}

// Events

export async function addEvent(store: Store, input: { title: string; starts_at: string }): Promise<StressEvent> {
  if (!validateTitle(input.title)) throw new Error('An event title must be 1 to 120 characters.');
  const day = requireStart(input.starts_at);
  return store.insert<StressEvent>(EVENTS, {
    title: input.title.trim(),
    starts_at: input.starts_at,
    day,
    reframe_helped: null,
    outcome_rating: null,
  });
}

export async function updateEvent(
  store: Store,
  id: string,
  patch: { title?: string; starts_at?: string },
): Promise<StressEvent> {
  const out: { title?: string; starts_at?: string; day?: string } = {};
  if (patch.title !== undefined) {
    if (!validateTitle(patch.title)) throw new Error('An event title must be 1 to 120 characters.');
    out.title = patch.title.trim();
  }
  if (patch.starts_at !== undefined) {
    out.day = requireStart(patch.starts_at);
    out.starts_at = patch.starts_at;
  }
  return store.update<StressEvent>(EVENTS, id, out);
}

export async function rateEvent(
  store: Store,
  id: string,
  input: { outcome_rating: number; reframe_helped: ReframeHelped },
): Promise<StressEvent> {
  if (!validateRating5(input.outcome_rating)) throw new Error('A rating must be a whole number from 1 to 5.');
  if (!validateReframeHelped(input.reframe_helped)) throw new Error('Reframe helped must be yes, a_bit or no.');
  return store.update<StressEvent>(EVENTS, id, {
    outcome_rating: input.outcome_rating,
    reframe_helped: input.reframe_helped,
  });
}

export async function deleteEvent(store: Store, id: string): Promise<void> {
  await store.softDelete(EVENTS, id);
}

/** Soonest first. */
export function listEvents(store: Store): Promise<StressEvent[]> {
  return store.list<StressEvent>(EVENTS, { orderBy: { column: 'starts_at' } });
}

export async function eventsBetween(store: Store, fromDay: string, toDay: string): Promise<StressEvent[]> {
  return between(await listEvents(store), fromDay, toDay);
}

// Series

export async function activeSeries(store: Store): Promise<Series | null> {
  return (await store.list<Series>(SERIES, { where: { status: 'active' }, limit: 1 }))[0] ?? null;
}

export async function startSeries(
  store: Store,
  input: { topic: string; planned_days: number; start_day: string },
): Promise<Series> {
  if (!validateTopic(input.topic)) throw new Error('A topic must be 1 to 60 characters.');
  if (!validatePlannedDays(input.planned_days)) throw new Error('A series is 3 or 4 days.');
  requireDay(input.start_day);
  const planned_days = input.planned_days;
  return store.transaction(async (tx) => {
    if ((await tx.list<Series>(SERIES, { where: { status: 'active' }, limit: 1 })).length > 0) {
      throw new Error('A writing series is already active.');
    }
    return tx.insert<Series>(SERIES, {
      topic: input.topic.trim(),
      planned_days,
      start_day: input.start_day,
      status: 'active',
    });
  });
}

/** Newest first. */
export function listSeries(store: Store): Promise<Series[]> {
  return store.list<Series>(SERIES, { orderBy: { column: 'created_at', direction: 'desc' } });
}

export function finishSeries(store: Store, id: string): Promise<Series> {
  return store.update<Series>(SERIES, id, { status: 'finished' });
}

export function stopSeries(store: Store, id: string): Promise<Series> {
  return store.update<Series>(SERIES, id, { status: 'stopped' });
}

// Sessions

export async function startSession(
  store: Store,
  input: { series_id: string; day: string; mood_before: number; minutes: number },
): Promise<Session> {
  if (!validateRating5(input.mood_before)) throw new Error('Mood must be a whole number from 1 to 5.');
  if (!validateMinutes(input.minutes)) throw new Error('Minutes must be a whole number from 0 to 240.');
  requireDay(input.day);
  return store.insert<Session>(SESSIONS, {
    series_id: input.series_id,
    day: input.day,
    minutes: input.minutes,
    mood_before: input.mood_before,
    mood_after: null,
  });
}

export async function finishSession(
  store: Store,
  id: string,
  input: { mood_after: number; minutes: number },
): Promise<Session> {
  if (!validateRating5(input.mood_after)) throw new Error('Mood must be a whole number from 1 to 5.');
  if (!validateMinutes(input.minutes)) throw new Error('Minutes must be a whole number from 0 to 240.');
  return store.update<Session>(SESSIONS, id, { mood_after: input.mood_after, minutes: input.minutes });
}

/** Oldest first. */
export function sessionsForSeries(store: Store, seriesId: string): Promise<Session[]> {
  return store.list<Session>(SESSIONS, { where: { series_id: seriesId }, orderBy: { column: 'created_at' } });
}

export async function sessionsBetween(store: Store, from: string, to: string): Promise<Session[]> {
  return between(await store.list<Session>(SESSIONS, { orderBy: { column: 'created_at' } }), from, to);
}

// Gratitude

/** Idempotent: returns the existing live row for that day if there is one. */
export async function markGratitude(store: Store, day: string): Promise<Gratitude> {
  requireDay(day);
  return store.transaction(async (tx) => {
    const hit = (await tx.list<Gratitude>(GRATITUDE, { where: { day }, limit: 1 }))[0];
    return hit ?? tx.insert<Gratitude>(GRATITUDE, { day });
  });
}

export async function unmarkGratitude(store: Store, day: string): Promise<void> {
  for (const row of await store.list<Gratitude>(GRATITUDE, { where: { day } })) {
    await store.softDelete(GRATITUDE, row.id);
  }
}

/** Days marked done, newest first. */
export async function gratitudeDays(store: Store): Promise<string[]> {
  const rows = await store.list<Gratitude>(GRATITUDE, { orderBy: { column: 'day', direction: 'desc' } });
  return rows.map((r) => r.day);
}

export async function gratitudeBetween(store: Store, from: string, to: string): Promise<string[]> {
  return (await gratitudeDays(store)).filter((d) => d >= from && d <= to).reverse();
}
