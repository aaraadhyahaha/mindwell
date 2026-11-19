import type { BaseRecord, SignalDef, SignalValue, Signals, Store } from '@mindwell/core';
import { addDays, signalList, signalNumber, signalObject } from '@mindwell/core';

/** The record fields signals read (structural, so tests can pass plain objects). */
export interface RecordRow {
  day: string;
  story_id: string | null;
  intensity_before: number | null;
  intensity_after: number | null;
  complete: number;
  /** ISO UTC; orders records within a story. */
  created_at: string;
}

export interface StoryTrend {
  story_id: string;
  name: string;
  first_before: number;
  last_after: number;
  n: number;
}

export interface Ch02SignalValues {
  records_7d: number;
  avg_drop_7d: number | null;
  story_trend: StoryTrend[];
  /** `undefined` (not published) when ch01's story counts are unavailable. */
  unchallenged_story: { id: string; name: string } | null | undefined;
}

type Obj = { readonly [k: string]: SignalValue };
const isObj = (v: SignalValue): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

/** `ch01.stories` as id → name (empty when ch01 is inactive). Pure. */
export function storyNames(s: Signals): Map<string, string> {
  const out = new Map<string, string>();
  for (const v of signalList(s, 'ch01.stories')) {
    if (isObj(v) && typeof v.id === 'string' && typeof v.name === 'string') out.set(v.id, v.name);
  }
  return out;
}

/** `ch01.story_counts_7d`, or undefined when the key is absent (ch01 inactive). Pure. */
function storyCounts(s: Signals): { id: string; name: string; count: number }[] | undefined {
  if (!Array.isArray(s['ch01.story_counts_7d'])) return undefined;
  return signalList(s, 'ch01.story_counts_7d').flatMap((v) =>
    isObj(v) && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.count === 'number'
      ? [{ id: v.id, name: v.name, count: v.count }]
      : [],
  );
}

type Done = RecordRow & { intensity_before: number; intensity_after: number };
const isDone = (r: RecordRow): r is Done => r.complete === 1 && r.intensity_before !== null && r.intensity_after !== null;

/**
 * Every ch02 signal value from live rows and the ch01 signals in `ext` (core + earlier
 * modules). Only complete records count. "Last 7 days" = `day−6 … day`. Pure.
 */
export function ch02SignalValues(records: readonly RecordRow[], ext: Signals, day: string): Ch02SignalValues {
  const done = records.filter(isDone).filter((r) => r.day <= day);
  const week = done.filter((r) => r.day >= addDays(day, -6));
  const avg_drop_7d = week.length
    ? week.reduce((sum, r) => sum + (r.intensity_before - r.intensity_after), 0) / week.length
    : null;

  const names = storyNames(ext);
  const byStory = new Map<string, Done[]>();
  for (const r of done) {
    if (r.story_id === null || !names.has(r.story_id)) continue;
    byStory.set(r.story_id, [...(byStory.get(r.story_id) ?? []), r]);
  }
  const story_trend = [...byStory]
    .filter(([, rs]) => rs.length >= 2)
    .map(([story_id, rs]) => {
      const sorted = [...rs].sort((a, b) => a.created_at.localeCompare(b.created_at));
      return {
        story_id,
        name: names.get(story_id)!,
        first_before: sorted[0]!.intensity_before,
        last_after: sorted[sorted.length - 1]!.intensity_after,
        n: sorted.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const counts = storyCounts(ext);
  let unchallenged_story: Ch02SignalValues['unchallenged_story'];
  if (counts !== undefined) {
    const from = addDays(day, -13);
    const tested = new Set(done.filter((r) => r.day >= from && r.story_id !== null).map((r) => r.story_id));
    const hit = counts
      .filter((c) => c.count >= 3 && !tested.has(c.id))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
    unchallenged_story = hit ? { id: hit.id, name: hit.name } : null;
  }

  return { records_7d: week.length, avg_drop_7d, story_trend, unchallenged_story };
}

async function load(store: Store, signals: Signals, day: string): Promise<Ch02SignalValues> {
  const records = await store.list<RecordRow & BaseRecord>('ch02_thought_records', {
    orderBy: { column: 'created_at', direction: 'desc' },
    limit: 5000,
  });
  return ch02SignalValues(records, signals, day);
}

function def(name: keyof Ch02SignalValues): SignalDef {
  return {
    key: `ch02.${name}`,
    async compute({ store, day, signals }) {
      return (await load(store, signals, day))[name] as unknown as SignalValue | undefined;
    },
  };
}

export const signals: SignalDef[] = [def('records_7d'), def('avg_drop_7d'), def('story_trend'), def('unchallenged_story')];

/** `ch02.unchallenged_story` from a snapshot, or undefined when unset/absent. Pure. */
export function unchallengedStory(s: Signals): { id: string; name: string } | undefined {
  const o = signalObject(s, 'ch02.unchallenged_story');
  return o && typeof o.id === 'string' && typeof o.name === 'string' && o.name ? { id: o.id, name: o.name } : undefined;
}

/** `ch02.story_trend` from a snapshot, malformed entries dropped. Pure. */
export function storyTrend(s: Signals): StoryTrend[] {
  return signalList(s, 'ch02.story_trend').flatMap((v) =>
    isObj(v) &&
    typeof v.story_id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.first_before === 'number' &&
    typeof v.last_after === 'number' &&
    typeof v.n === 'number'
      ? [{ story_id: v.story_id, name: v.name, first_before: v.first_before, last_after: v.last_after, n: v.n }]
      : [],
  );
}

/** Today "Start a thought record" card: always shown while ch02 is active. Pure. */
export const startCardVisible = (_s: Signals): boolean => true;

/** Sidebar count beside "Thought records": complete records this week, or null. Pure. */
export const recordsNavCount = (s: Signals): number | null => {
  const n = signalNumber(s, 'ch02.records_7d') ?? 0;
  return n > 0 ? n : null;
};
