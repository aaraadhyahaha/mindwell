import { describe, expect, it } from 'vitest';
import { emptyFields } from './form';
import { dayLabel, draftStep, groupByDay, storyCharts } from './history';
import type { ThoughtRecord } from './schema';

const rec = (o: Partial<ThoughtRecord>): ThoughtRecord =>
  ({
    id: 'x',
    created_at: '2026-11-19T08:00:00Z',
    day: '2026-11-19',
    story_id: null,
    ...emptyFields(),
    complete: 1,
    ...o,
  }) as ThoughtRecord;

describe('dayLabel', () => {
  it('names today and yesterday, else weekday', () => {
    expect(dayLabel('2026-11-19', '2026-11-19')).toBe('Today');
    expect(dayLabel('2026-11-18', '2026-11-19')).toBe('Yesterday');
    expect(dayLabel('2026-11-12', '2026-11-19')).toBe('Thursday, 12 November');
  });
});

describe('groupByDay', () => {
  it('skips drafts, newest day first', () => {
    const g = groupByDay([
      rec({ id: 'a', day: '2026-11-17' }),
      rec({ id: 'b', day: '2026-11-19', created_at: '2026-11-19T09:00:00Z' }),
      rec({ id: 'c', day: '2026-11-19', complete: 0 }),
      rec({ id: 'd', day: '2026-11-19', created_at: '2026-11-19T10:00:00Z' }),
    ]);
    expect(g.map(([d, rs]) => [d, rs.map((r) => r.id)])).toEqual([
      ['2026-11-19', ['d', 'b']],
      ['2026-11-17', ['a']],
    ]);
  });
});

describe('storyCharts', () => {
  const names = new Map([['s1', 'I will fail'], ['s2', 'Other']]);
  it('needs two complete records and a name', () => {
    const rs = [
      rec({ story_id: 's1', created_at: '2026-11-02', intensity_before: 80, intensity_after: 60 }),
      rec({ story_id: 's1', created_at: '2026-11-01', intensity_before: 70, intensity_after: 50 }),
      rec({ story_id: 's1', created_at: '2026-11-03', intensity_before: 60, intensity_after: 45, complete: 0 }),
      rec({ story_id: 's2', intensity_before: 50, intensity_after: 40 }),
      rec({ story_id: 's3', intensity_before: 50, intensity_after: 40 }),
      rec({ story_id: 's3', intensity_before: 50, intensity_after: 40 }),
    ];
    const c = storyCharts(rs, names);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ story_id: 's1', n: 2, first_before: 70, last_after: 60 });
    expect(c[0]!.series[0]!.points).toEqual([{ x: 1, y: 70 }, { x: 2, y: 80 }]);
    expect(c[0]!.series[1]!.points).toEqual([{ x: 1, y: 50 }, { x: 2, y: 60 }]);
  });
});

describe('draftStep', () => {
  it('names the first empty step', () => {
    expect(draftStep(rec({ complete: 0 }))).toBe('i. Situation');
    expect(draftStep(rec({ complete: 0, situation: 'x', automatic_thought: 'y' }))).toBe('iii. Feeling');
  });
});
