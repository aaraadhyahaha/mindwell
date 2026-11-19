import type { Module } from './module';
import type { SignalValue, Signals } from './prompts';
import type { ChapterRecord, DayRecord, SettingRecord } from './records';
import type { Store } from './store';
import { CORE_TABLES } from './records';
import { addDays } from './dates';
import { readChapters } from './library';
import { recentlyUnlocked } from './registry';

/** Keys of the signals core publishes (unprefixed; module keys are `<id>.<name>`). */
export const CORE_SIGNALS = {
  dayTypes: 'day.types',
  dayEnergy: 'day.energy',
  dayRating: 'day.rating',
  yesterdayRating: 'yesterday.rating',
  yesterdayIntentResult: 'yesterday.intent_result',
  userName: 'user.name',
  upcomingEvents: 'upcoming_events',
  recentlyUnlocked: 'chapters.recently_unlocked',
} as const;

/** Settings key holding the user's name (JSON string). */
export const NAME_SETTING = 'name';

/** Module signals named `<id>.upcoming_events` (arrays) are concatenated into core's `upcoming_events`. */
const UPCOMING_EVENTS_SUFFIX = '.upcoming_events';

// ---- Pure helpers for conditions and fill() ----

/** The signal as a finite number, else undefined (so `null <= 2` can't slip through). */
export function signalNumber(s: Signals, key: string): number | undefined {
  const v = s[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** The signal as a non-empty string, else undefined. */
export function signalString(s: Signals, key: string): string | undefined {
  const v = s[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** The signal as an array, else []. */
export function signalList(s: Signals, key: string): readonly SignalValue[] {
  const v = s[key];
  return Array.isArray(v) ? v : [];
}

/** True if the signal is an array containing `value`. */
export function signalIncludes(s: Signals, key: string, value: SignalValue): boolean {
  return signalList(s, key).includes(value);
}

/** The signal as a plain object, else undefined. */
export function signalObject(s: Signals, key: string): { readonly [k: string]: SignalValue } | undefined {
  const v = s[key];
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as { readonly [k: string]: SignalValue }) : undefined;
}

// ---- Snapshot ----

export interface CoreSignalInput {
  today: Pick<DayRecord, 'types' | 'energy' | 'rating'> | null;
  yesterday: Pick<DayRecord, 'rating' | 'intent_result'> | null;
  userName: string | null;
  recentlyUnlocked: readonly string[];
  upcomingEvents: readonly SignalValue[];
}

/** Core's signals from plain data. Missing values are null. Pure. */
export function coreSignals(input: CoreSignalInput): Signals {
  return {
    [CORE_SIGNALS.dayTypes]: parseDayTypes(input.today?.types),
    [CORE_SIGNALS.dayEnergy]: input.today?.energy ?? null,
    [CORE_SIGNALS.dayRating]: input.today?.rating ?? null,
    [CORE_SIGNALS.yesterdayRating]: input.yesterday?.rating ?? null,
    [CORE_SIGNALS.yesterdayIntentResult]: input.yesterday?.intent_result ?? null,
    [CORE_SIGNALS.userName]: input.userName && input.userName.trim() ? input.userName.trim() : null,
    [CORE_SIGNALS.upcomingEvents]: [...input.upcomingEvents],
    [CORE_SIGNALS.recentlyUnlocked]: [...input.recentlyUnlocked],
  };
}

/** `days.types` JSON → string[]; anything malformed → []. */
export function parseDayTypes(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export interface BuildSignalsOptions {
  store: Store;
  /** Local day the snapshot is for. */
  day: string;
  /** ISO UTC. Defaults to now. */
  now?: string;
  /** Active modules only (see `activeModules`). Inactive modules' keys are simply absent. */
  active: readonly Module<unknown>[];
  /** Pass if already loaded; otherwise read from the store. */
  chapters?: readonly ChapterRecord[];
}

export interface SignalsSnapshot {
  signals: Signals;
  /** Module signal keys whose compute() threw; they are absent from `signals`. */
  failed: { key: string; error: unknown }[];
}

/**
 * Computes the snapshot once: every active module's signals plus core's.
 * Call it after the morning check-in's day types and energy are saved (and,
 * in the evening, after the day rating), since core's `day.*` signals read the
 * `days` row. A module signal that throws is left out and reported in `failed`.
 */
export async function buildSignals(opts: BuildSignalsOptions): Promise<SignalsSnapshot> {
  const { store, day, active } = opts;
  const now = opts.now ?? new Date().toISOString();

  const [todayRows, yesterdayRows, nameRows, chapters] = await Promise.all([
    store.list<DayRecord>(CORE_TABLES.days, { where: { day }, limit: 1 }),
    store.list<DayRecord>(CORE_TABLES.days, { where: { day: addDays(day, -1) }, limit: 1 }),
    store.list<SettingRecord>(CORE_TABLES.settings, { where: { key: NAME_SETTING }, limit: 1 }),
    opts.chapters ? Promise.resolve(opts.chapters) : readChapters(store),
  ]);

  const moduleSignals: Record<string, SignalValue> = {};
  const failed: SignalsSnapshot['failed'] = [];
  for (const m of active) {
    for (const def of m.signals) {
      try {
        moduleSignals[def.key] = await def.compute({ store, day, now });
      } catch (error) {
        failed.push({ key: def.key, error });
      }
    }
  }

  const upcomingEvents = Object.entries(moduleSignals)
    .filter(([key, v]) => key.endsWith(UPCOMING_EVENTS_SUFFIX) && Array.isArray(v))
    .flatMap(([, v]) => v as readonly SignalValue[]);

  const core = coreSignals({
    today: todayRows[0] ?? null,
    yesterday: yesterdayRows[0] ?? null,
    userName: parseName(nameRows[0]?.value),
    recentlyUnlocked: recentlyUnlocked(active, chapters, day),
    upcomingEvents,
  });

  return { signals: { ...moduleSignals, ...core }, failed };
}

function parseName(json: string | undefined): string | null {
  if (json === undefined) return null;
  try {
    const v: unknown = JSON.parse(json);
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}
