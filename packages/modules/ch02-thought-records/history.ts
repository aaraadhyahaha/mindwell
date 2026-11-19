import { addDays } from '@mindwell/core';
import { STEPS, fieldsOf, stepFilled } from './form';
import type { ThoughtRecord } from './schema';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Today", "Yesterday", else "Thursday, 19 November". Pure. */
export function dayLabel(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${d} ${MONTHS[m - 1]}`;
}

type Dated = Pick<ThoughtRecord, 'day' | 'complete' | 'created_at'>;

/** Complete records grouped by day, newest day first, newest record first within a day. Pure. */
export function groupByDay<T extends Dated>(records: readonly T[]): [string, T[]][] {
  const by = new Map<string, T[]>();
  for (const r of records) {
    if (r.complete !== 1) continue;
    by.set(r.day, [...(by.get(r.day) ?? []), r]);
  }
  return [...by]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([d, rs]) => [d, rs.sort((a, b) => b.created_at.localeCompare(a.created_at))]);
}

export interface StoryChart {
  story_id: string;
  name: string;
  n: number;
  first_before: number;
  last_after: number;
  series: { label: string; points: { x: number; y: number }[] }[];
}

type Charted = Pick<ThoughtRecord, 'story_id' | 'complete' | 'created_at' | 'intensity_before' | 'intensity_after'>;

/** One chart per named story with at least two complete records (x = 1..n by created_at). Pure. */
export function storyCharts(records: readonly Charted[], names: ReadonlyMap<string, string>): StoryChart[] {
  const by = new Map<string, (Charted & { intensity_before: number; intensity_after: number })[]>();
  for (const r of records) {
    if (r.complete !== 1 || r.story_id === null || !names.has(r.story_id)) continue;
    if (r.intensity_before === null || r.intensity_after === null) continue;
    const mine = by.get(r.story_id) ?? [];
    mine.push(r as Charted & { intensity_before: number; intensity_after: number });
    by.set(r.story_id, mine);
  }
  return [...by]
    .filter(([, rs]) => rs.length >= 2)
    .map(([story_id, rs]) => {
      const sorted = [...rs].sort((a, b) => a.created_at.localeCompare(b.created_at));
      return {
        story_id,
        name: names.get(story_id)!,
        n: sorted.length,
        first_before: sorted[0]!.intensity_before,
        last_after: sorted[sorted.length - 1]!.intensity_after,
        series: [
          { label: 'Before', points: sorted.map((r, i) => ({ x: i + 1, y: r.intensity_before })) },
          { label: 'After', points: sorted.map((r, i) => ({ x: i + 1, y: r.intensity_after })) },
        ],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The first empty step of a draft, as "ii. The thought". Pure. */
export function draftStep(record: ThoughtRecord): string {
  const f = fieldsOf(record);
  const s = STEPS.find((x) => !stepFilled(x.key, f)) ?? STEPS[STEPS.length - 1]!;
  return `${s.n} ${s.short}`;
}
