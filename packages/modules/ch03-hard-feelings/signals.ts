import type { BaseRecord, SignalDef, SignalValue, Signals, Store } from '@mindwell/core';
import { addDays, daysBetween, signalNumber, signalObject } from '@mindwell/core';

/** The record fields signals read (structural, so tests can pass plain objects). */
export interface EventRow {
  id: string;
  title: string;
  starts_at: string;
  day: string;
  reframe_helped: string | null;
  outcome_rating: number | null;
}

export interface SeriesRow {
  id: string;
  topic: string;
  planned_days: number;
  start_day: string;
  status: string;
}

export interface SessionRow {
  series_id: string;
  day: string;
  mood_before: number;
  mood_after: number | null;
}

export interface EventToday {
  id: string;
  title: string;
  starts_at: string;
}

export interface SeriesActive {
  id: string;
  topic: string;
  /** The next session's number: finished sessions + 1 (a skipped calendar day does not advance it). */
  day_n: number;
  planned: number;
  /** A session was finished today. */
  done_today: boolean;
}

export interface SeriesMood {
  id: string;
  topic: string;
  /** Day of the series' last finished session. */
  last_day: string;
  n: number;
  avg_before: number;
  avg_after: number;
}

export interface Ch03SignalValues {
  /** The next of today's events that has not started yet, earliest first. */
  event_today: EventToday | null;
  /** Today's events that have started and have no outcome yet. */
  events_to_rate: EventToday[];
  series_active: SeriesActive | null;
  /** Days since gratitude was last marked done; Infinity if never. */
  days_since_gratitude: number;
  /** Share of rated events where the reframe helped (yes or a bit), or null with none rated. */
  reframe_helped_rate: number | null;
  reframe_counts: { helped: number; rated: number };
  /** Finished series with at least one before/after pair, newest last session first. */
  series_moods: SeriesMood[];
  /** Lines for core's "Coming up": events from now to 7 days ahead. */
  upcoming_events: string[];
}

const HELPED = new Set(['yes', 'a_bit']);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

/** `14:05` in local time. */
export function clock(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Today", "Tomorrow" or the weekday, for a day within the coming week. */
export function dayWord(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  const [y, m, d] = day.split('-').map(Number);
  return WEEKDAYS[new Date(y!, m! - 1, d!).getDay()]!;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Every ch03 signal value from live rows. Pure. */
export function ch03SignalValues(
  events: readonly EventRow[],
  series: readonly SeriesRow[],
  sessions: readonly SessionRow[],
  gratitudeDays: readonly string[],
  day: string,
  now: string,
): Ch03SignalValues {
  const t = Date.parse(now);
  const byStart = [...events].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const today = byStart.filter((e) => e.day === day);
  const pick = (e: EventRow): EventToday => ({ id: e.id, title: e.title, starts_at: e.starts_at });

  const next = today.find((e) => Date.parse(e.starts_at) > t);
  const events_to_rate = today.filter((e) => Date.parse(e.starts_at) <= t && e.outcome_rating === null).map(pick);

  const finished = (s: SessionRow) => s.mood_after !== null;
  const active = series.find((s) => s.status === 'active');
  let series_active: SeriesActive | null = null;
  if (active) {
    const done = sessions.filter((s) => s.series_id === active.id && finished(s));
    series_active = {
      id: active.id,
      topic: active.topic,
      day_n: Math.min(done.length + 1, active.planned_days),
      planned: active.planned_days,
      done_today: done.some((s) => s.day === day),
    };
  }

  const past = gratitudeDays.filter((d) => d <= day).sort();
  const last = past.at(-1);
  const days_since_gratitude = last === undefined ? Infinity : daysBetween(last, day);

  const rated = events.filter((e) => e.reframe_helped !== null);
  const helped = rated.filter((e) => HELPED.has(e.reframe_helped!)).length;

  const series_moods = series
    .filter((s) => s.status === 'finished')
    .flatMap((s) => {
      const pairs = sessions.filter((x) => x.series_id === s.id && finished(x));
      if (pairs.length === 0) return [];
      return [
        {
          id: s.id,
          topic: s.topic,
          last_day: pairs.map((p) => p.day).sort().at(-1)!,
          n: pairs.length,
          avg_before: round2(mean(pairs.map((p) => p.mood_before))),
          avg_after: round2(mean(pairs.map((p) => p.mood_after!))),
        },
      ];
    })
    .sort((a, b) => (a.last_day < b.last_day ? 1 : a.last_day > b.last_day ? -1 : 0));

  const weekEnd = addDays(day, 7);
  const upcoming_events = byStart
    .filter((e) => Date.parse(e.starts_at) > t && e.day <= weekEnd)
    .map((e) => {
      const w = dayWord(e.day, day);
      return `${e.title}, ${w === 'Today' || w === 'Tomorrow' ? w.toLowerCase() : w} at ${clock(e.starts_at)}`;
    });

  return {
    event_today: next ? pick(next) : null,
    events_to_rate,
    series_active,
    days_since_gratitude,
    reframe_helped_rate: rated.length > 0 ? helped / rated.length : null,
    reframe_counts: { helped, rated: rated.length },
    series_moods,
    upcoming_events,
  };
}

async function load(store: Store, day: string, now: string): Promise<Ch03SignalValues> {
  const [events, series, sessions, gratitude] = await Promise.all([
    store.list<EventRow & BaseRecord>('ch03_events'),
    store.list<SeriesRow & BaseRecord>('ch03_series'),
    store.list<SessionRow & BaseRecord>('ch03_sessions'),
    store.list<{ day: string } & BaseRecord>('ch03_gratitude'),
  ]);
  return ch03SignalValues(events, series, sessions, gratitude.map((g) => g.day), day, now);
}

function def(name: keyof Ch03SignalValues): SignalDef {
  return {
    key: `ch03.${name}`,
    async compute({ store, day, now }) {
      return (await load(store, day, now))[name] as unknown as SignalValue;
    },
  };
}

export const signals: SignalDef[] = [
  def('event_today'),
  def('events_to_rate'),
  def('series_active'),
  def('days_since_gratitude'),
  def('reframe_helped_rate'),
  def('reframe_counts'),
  def('series_moods'),
  def('upcoming_events'),
];

/** Typed reads of the snapshot. Pure. */
export const eventToday = (s: Signals): EventToday | null => (signalObject(s, 'ch03.event_today') as EventToday | undefined) ?? null;
export const eventsToRate = (s: Signals): EventToday[] => {
  const v = s['ch03.events_to_rate'];
  return Array.isArray(v) ? (v as unknown as EventToday[]) : [];
};
export const seriesActive = (s: Signals): SeriesActive | null =>
  (signalObject(s, 'ch03.series_active') as SeriesActive | undefined) ?? null;
/** Infinity when never done (or the signal is missing). */
export const daysSinceGratitude = (s: Signals): number => signalNumber(s, 'ch03.days_since_gratitude') ?? Infinity;

/** Today card visibility. Pure. */
export const reappraisalCardVisible = (s: Signals): boolean => eventToday(s) !== null;
export const rateCardVisible = (s: Signals): boolean => eventsToRate(s).length > 0;
export const sessionCardVisible = (s: Signals): boolean => {
  const a = seriesActive(s);
  return a !== null && !a.done_today;
};
