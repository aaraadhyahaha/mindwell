import { addDays, daysBetween } from '@mindwell/core';
import type { CaptureRecord, StoryRecord } from './schema';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parts(day: string): [number, number, number] {
  return day.split('-').map(Number) as [number, number, number];
}

/** "12 November". */
export function dayMonth(day: string): string {
  const [, m, d] = parts(day);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "Today", "Yesterday", else "Thursday, 12 November". */
export function dayLabel(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = parts(day);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${d} ${MONTHS[m - 1]}`;
}

/** Local "08:12" for an ISO instant. */
export function clockTime(iso: string): string {
  const t = new Date(iso);
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

export interface StoryRow {
  story: StoryRecord;
  /** Captures in the 7 days ending today. */
  week: number;
  /** Captures per day, oldest first, 7 entries ending today. */
  perDay: number[];
  /** "First named 12 November · up from 2 last week". */
  line: string;
}

/**
 * One row per story for the Thoughts screen. The week is the 7 days ending `today`; "last week"
 * is the 7 days before it, compared only once the story is older than this week. Busiest story first.
 */
export function storyRows(stories: readonly StoryRecord[], captures: readonly CaptureRecord[], today: string): StoryRow[] {
  const from = addDays(today, -6);
  const prevFrom = addDays(today, -13);
  return stories.map((story) => {
    const mine = captures.filter((c) => c.story_id === story.id);
    const perDay = Array.from({ length: 7 }, (_, i) => mine.filter((c) => c.day === addDays(from, i)).length);
    const week = perDay.reduce((a, b) => a + b, 0);
    const prev = mine.filter((c) => c.day >= prevFrom && c.day < from).length;
    let line = `First named ${dayMonth(story.first_seen_day)}`;
    if (story.first_seen_day < from) {
      line += week > prev ? ` · up from ${prev} last week` : week < prev ? ` · down from ${prev} last week` : ' · same as last week';
    }
    return { story, week, perDay, line };
  }).sort((a, b) => b.week - a.week);
}

/** Bar heights in percent for a sparkline, scaled to the busiest day across all rows. */
export function sparkHeights(perDay: readonly number[], max: number): number[] {
  return perDay.map((n) => (max > 0 ? Math.round((n / max) * 100) : 0));
}

/** Captures from the last `days` days (ending today), grouped by day, newest day and newest capture first. */
export function capturesByDay(captures: readonly CaptureRecord[], today: string, days = 30): [string, CaptureRecord[]][] {
  const byDay = new Map<string, CaptureRecord[]>();
  for (const c of captures) {
    const age = daysBetween(c.day, today);
    if (age < 0 || age >= days) continue;
    byDay.set(c.day, [...(byDay.get(c.day) ?? []), c]);
  }
  return [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([d, list]) => [d, [...list].sort((a, b) => b.captured_at.localeCompare(a.captured_at))]);
}
