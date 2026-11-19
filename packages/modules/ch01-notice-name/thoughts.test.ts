import { describe, expect, it } from 'vitest';
import { capturesByDay, dayLabel, dayMonth, sparkHeights, storyRows } from './thoughts';
import type { CaptureRecord, StoryRecord } from './schema';

const base = { created_at: '', updated_at: '', deleted_at: null, schema_version: 1 };
const story = (id: string, first: string): StoryRecord => ({ ...base, id, name: id, first_seen_day: first, archived: 0 });
const cap = (id: string, day: string, storyId: string | null, at = `${day}T10:00:00.000Z`): CaptureRecord => ({
  ...base,
  id,
  text: id,
  story_id: storyId,
  intensity: null,
  captured_at: at,
  day,
});

describe('dates in words', () => {
  it('names today and yesterday, else weekday and date', () => {
    expect(dayLabel('2026-11-19', '2026-11-19')).toBe('Today');
    expect(dayLabel('2026-11-18', '2026-11-19')).toBe('Yesterday');
    expect(dayLabel('2026-11-12', '2026-11-19')).toBe('Thursday, 12 November');
    expect(dayMonth('2026-01-03')).toBe('3 January');
  });
});

describe('storyRows', () => {
  const today = '2026-11-19';
  it('counts the week per day, oldest first, and compares with last week', () => {
    const [row] = storyRows(
      [story('a', '2026-11-01')],
      [cap('1', '2026-11-19', 'a'), cap('2', '2026-11-13', 'a'), cap('3', '2026-11-12', 'a'), cap('4', '2026-11-19', 'b')],
      today,
    );
    expect(row?.perDay).toEqual([1, 0, 0, 0, 0, 0, 1]);
    expect(row?.week).toBe(2);
    expect(row?.line).toBe('First named 1 November · up from 1 last week');
  });
  it('sorts busiest first, says same or down, and skips the comparison for a story first named this week', () => {
    const caps = [cap('1', '2026-11-10', 'a'), cap('2', '2026-11-18', 'b')];
    const rows = storyRows([story('a', '2026-11-01'), story('b', '2026-11-18'), story('c', '2026-11-01')], caps, today);
    expect(rows.map((r) => r.line)).toEqual([
      'First named 18 November',
      'First named 1 November · down from 1 last week',
      'First named 1 November · same as last week',
    ]);
  });
});

describe('sparkHeights', () => {
  it('scales to the busiest day', () => {
    expect(sparkHeights([0, 1, 2, 4], 4)).toEqual([0, 25, 50, 100]);
    expect(sparkHeights([0, 0], 0)).toEqual([0, 0]);
  });
});

describe('capturesByDay', () => {
  it('groups the last 30 days, newest day and capture first', () => {
    const groups = capturesByDay(
      [
        cap('old', '2026-10-20', null),
        cap('a', '2026-11-18', null, '2026-11-18T09:00:00.000Z'),
        cap('b', '2026-11-19', null, '2026-11-19T07:00:00.000Z'),
        cap('c', '2026-11-19', null, '2026-11-19T08:00:00.000Z'),
      ],
      '2026-11-19',
    );
    expect(groups.map(([d, l]) => [d, l.map((c) => c.id)])).toEqual([
      ['2026-11-19', ['c', 'b']],
      ['2026-11-18', ['a']],
    ]);
  });
});
