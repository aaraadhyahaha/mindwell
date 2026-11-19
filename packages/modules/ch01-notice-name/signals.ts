import type { BaseRecord, SignalDef, SignalValue, Signals, Store } from '@mindwell/core';
import { addDays, signalList, signalNumber } from '@mindwell/core';

/** The fields signals read (structural, so tests can pass plain objects). */
export interface StoryRow {
  id: string;
  name: string;
}

export interface CaptureRow {
  story_id: string | null;
  day: string;
}

export interface StoryCount {
  id: string;
  name: string;
  count: number;
}

export interface Ch01SignalValues {
  captures_today: number;
  captures_yesterday: number;
  top_story_7d: StoryCount | null;
  story_counts_7d: StoryCount[];
  repeating_story: { id: string; name: string; days: number } | null;
  unlinked_7d: number;
  story_fortnights: { id: string; name: string; current: number; previous: number }[];
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
const byCountThenName = (a: { count: number; name: string }, b: { count: number; name: string }) =>
  b.count - a.count || a.name.localeCompare(b.name);

/** Every ch01 signal value from live rows. "Last 7 days" = `day−6 … day`. Pure. */
export function ch01SignalValues(stories: readonly StoryRow[], captures: readonly CaptureRow[], day: string): Ch01SignalValues {
  const names = new Map(stories.map((s) => [s.id, s.name]));
  const week = captures.filter((c) => inRange(c.day, addDays(day, -6), day));

  const counts = new Map<string, number>();
  const daysByStory = new Map<string, Set<string>>();
  for (const c of week) {
    if (c.story_id === null || !names.has(c.story_id)) continue;
    counts.set(c.story_id, (counts.get(c.story_id) ?? 0) + 1);
    const set = daysByStory.get(c.story_id) ?? new Set<string>();
    set.add(c.day);
    daysByStory.set(c.story_id, set);
  }
  const story_counts_7d = [...counts].map(([id, count]) => ({ id, name: names.get(id)!, count })).sort(byCountThenName);

  const repeating = [...daysByStory]
    .map(([id, set]) => ({ id, name: names.get(id)!, days: set.size }))
    .filter((r) => r.days >= 5)
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));

  const curFrom = addDays(day, -13);
  const prevFrom = addDays(day, -27);
  const prevTo = addDays(day, -14);
  const story_fortnights = stories
    .map((s) => ({
      id: s.id,
      name: s.name,
      current: captures.filter((c) => c.story_id === s.id && inRange(c.day, curFrom, day)).length,
      previous: captures.filter((c) => c.story_id === s.id && inRange(c.day, prevFrom, prevTo)).length,
    }))
    .filter((s) => s.current > 0 || s.previous > 0)
    .sort((a, b) => b.previous - a.previous || a.name.localeCompare(b.name));

  return {
    captures_today: captures.filter((c) => c.day === day).length,
    captures_yesterday: captures.filter((c) => c.day === addDays(day, -1)).length,
    top_story_7d: story_counts_7d[0] ?? null,
    story_counts_7d,
    repeating_story: repeating[0] ?? null,
    unlinked_7d: week.filter((c) => c.story_id === null).length,
    story_fortnights,
  };
}

async function load(store: Store, day: string): Promise<Ch01SignalValues> {
  const [stories, captures] = await Promise.all([
    store.list<StoryRow & BaseRecord>('ch01_stories'),
    store.list<CaptureRow & BaseRecord>('ch01_captures', { orderBy: { column: 'day', direction: 'desc' }, limit: 5000 }),
  ]);
  return ch01SignalValues(stories, captures, day);
}

function def(name: keyof Ch01SignalValues): SignalDef {
  return {
    key: `ch01.${name}`,
    async compute({ store, day }) {
      return (await load(store, day))[name] as unknown as SignalValue;
    },
  };
}

export const signals: SignalDef[] = [
  def('captures_today'),
  def('captures_yesterday'),
  def('top_story_7d'),
  def('story_counts_7d'),
  def('repeating_story'),
  def('unlinked_7d'),
  def('story_fortnights'),
];

/** Evening card visibility: something was captured today. Pure. */
export const eveningCardVisible = (s: Signals): boolean => (signalNumber(s, 'ch01.captures_today') ?? 0) > 0;

/** Nav count beside "Thoughts": captures in the last 7 days (linked or not), or null when none. Pure. */
export const thoughtsNavCount = (s: Signals): number | null => {
  const linked = signalList(s, 'ch01.story_counts_7d').reduce<number>((sum, v) => {
    const n = v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as { readonly count?: SignalValue }).count : undefined;
    return sum + (typeof n === 'number' ? n : 0);
  }, 0);
  const total = linked + (signalNumber(s, 'ch01.unlinked_7d') ?? 0);
  return total > 0 ? total : null;
};
