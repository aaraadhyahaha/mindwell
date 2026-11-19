import { describe, expect, it } from 'vitest';
import type { Signals } from '@mindwell/core';
import { ch02SignalValues, recordsNavCount, startCardVisible, storyTrend, unchallengedStory, type RecordRow } from './signals';

const DAY = '2026-11-19';

let seq = 0;
const rec = (over: Partial<RecordRow> = {}): RecordRow => {
  seq += 1;
  return {
    day: DAY,
    story_id: null,
    intensity_before: 80,
    intensity_after: 50,
    complete: 1,
    created_at: `2026-11-19T10:${String(seq).padStart(2, '0')}:00Z`,
    ...over,
  };
};

const stories = (...pairs: [string, string][]): Signals => ({
  'ch01.stories': pairs.map(([id, name]) => ({ id, name })),
});
const counts = (...rows: [string, string, number][]): Signals => ({
  'ch01.stories': rows.map(([id, name]) => ({ id, name })),
  'ch01.story_counts_7d': rows.map(([id, name, count]) => ({ id, name, count })),
});

describe('ch02SignalValues: records_7d and avg_drop_7d', () => {
  it('is zero and null for empty records', () => {
    const v = ch02SignalValues([], {}, DAY);
    expect(v.records_7d).toBe(0);
    expect(v.avg_drop_7d).toBeNull();
    expect(v.story_trend).toEqual([]);
  });

  it('counts only complete records', () => {
    const v = ch02SignalValues(
      [
        rec({ complete: 0 }),
        rec({ intensity_after: null }),
        rec({ intensity_before: null }),
        rec({ intensity_before: 70, intensity_after: 40 }),
      ],
      {},
      DAY,
    );
    expect(v.records_7d).toBe(1);
    expect(v.avg_drop_7d).toBe(30);
  });

  it('window is day−6 … day inclusive: day−6 and day count, day−7 does not', () => {
    const v = ch02SignalValues(
      [rec({ day: '2026-11-19' }), rec({ day: '2026-11-13' }), rec({ day: '2026-11-12' })],
      {},
      DAY,
    );
    expect(v.records_7d).toBe(2);
  });

  it('excludes future days', () => {
    const v = ch02SignalValues([rec({ day: '2026-11-20' }), rec({ day: '2026-11-19' })], {}, DAY);
    expect(v.records_7d).toBe(1);
  });

  it('avg_drop_7d is the mean of before − after (negative drops included)', () => {
    const v = ch02SignalValues(
      [
        rec({ intensity_before: 80, intensity_after: 50 }), // 30
        rec({ intensity_before: 60, intensity_after: 40 }), // 20
        rec({ intensity_before: 40, intensity_after: 60 }), // -20
      ],
      {},
      DAY,
    );
    expect(v.avg_drop_7d).toBeCloseTo(10);
  });

  it('avg_drop_7d ignores records outside the window', () => {
    const v = ch02SignalValues(
      [rec({ day: '2026-11-01', intensity_before: 100, intensity_after: 0 }), rec({ intensity_before: 50, intensity_after: 40 })],
      {},
      DAY,
    );
    expect(v.avg_drop_7d).toBe(10);
  });

  it('avg_drop_7d is null when the window holds no complete record', () => {
    expect(ch02SignalValues([rec({ day: '2026-10-01' })], {}, DAY).avg_drop_7d).toBeNull();
  });
});

describe('ch02SignalValues: story_trend', () => {
  it('needs at least 2 complete records for a story', () => {
    const ext = stories(['s1', 'money worries']);
    const one = ch02SignalValues([rec({ story_id: 's1' })], ext, DAY);
    expect(one.story_trend).toEqual([]);
    const two = ch02SignalValues([rec({ story_id: 's1' }), rec({ story_id: 's1' })], ext, DAY);
    expect(two.story_trend).toHaveLength(1);
  });

  it('ignores a story whose name is not in ch01.stories', () => {
    const v = ch02SignalValues([rec({ story_id: 'gone' }), rec({ story_id: 'gone' })], stories(['s1', 'x']), DAY);
    expect(v.story_trend).toEqual([]);
  });

  it('ignores records with no story and draft records in the count', () => {
    const ext = stories(['s1', 'money worries']);
    const v = ch02SignalValues(
      [rec({ story_id: null }), rec({ story_id: null }), rec({ story_id: 's1' }), rec({ story_id: 's1', complete: 0 })],
      ext,
      DAY,
    );
    expect(v.story_trend).toEqual([]);
  });

  it('takes first_before from the earliest record and last_after from the latest, by created_at', () => {
    const ext = stories(['s1', 'money worries']);
    const v = ch02SignalValues(
      [
        rec({ story_id: 's1', created_at: '2026-11-15T09:00:00Z', intensity_before: 90, intensity_after: 60 }),
        rec({ story_id: 's1', created_at: '2026-11-18T09:00:00Z', intensity_before: 50, intensity_after: 20 }),
        rec({ story_id: 's1', created_at: '2026-11-16T09:00:00Z', intensity_before: 70, intensity_after: 65 }),
      ],
      ext,
      DAY,
    );
    expect(v.story_trend).toEqual([
      { story_id: 's1', name: 'money worries', first_before: 90, last_after: 20, n: 3 },
    ]);
  });

  it('sorts stories by name', () => {
    const ext = stories(['s1', 'zeta'], ['s2', 'alpha']);
    const v = ch02SignalValues(
      [rec({ story_id: 's1' }), rec({ story_id: 's1' }), rec({ story_id: 's2' }), rec({ story_id: 's2' })],
      ext,
      DAY,
    );
    expect(v.story_trend.map((t) => t.name)).toEqual(['alpha', 'zeta']);
  });

  it('does not count future records toward the trend', () => {
    const ext = stories(['s1', 'money worries']);
    const v = ch02SignalValues(
      [rec({ story_id: 's1' }), rec({ story_id: 's1', day: '2026-11-25' })],
      ext,
      DAY,
    );
    expect(v.story_trend).toEqual([]);
  });
});

describe('ch02SignalValues: unchallenged_story', () => {
  it('is undefined when ext has no ch01.story_counts_7d key (ch01 inactive)', () => {
    expect(ch02SignalValues([], {}, DAY).unchallenged_story).toBeUndefined();
    expect(ch02SignalValues([], stories(['s1', 'x']), DAY).unchallenged_story).toBeUndefined();
  });

  it('is null when no story has a count of at least 3', () => {
    const ext = counts(['s1', 'money worries', 2]);
    expect(ch02SignalValues([], ext, DAY).unchallenged_story).toBeNull();
  });

  it('is null when ch01.story_counts_7d is empty', () => {
    expect(ch02SignalValues([], counts(), DAY).unchallenged_story).toBeNull();
  });

  it('returns a story with count ≥ 3 and no complete record in day−13 … day', () => {
    const ext = counts(['s1', 'money worries', 3]);
    expect(ch02SignalValues([], ext, DAY).unchallenged_story).toEqual({ id: 's1', name: 'money worries' });
  });

  it('a complete record on day−13 counts as tested', () => {
    const ext = counts(['s1', 'money worries', 3]);
    const v = ch02SignalValues([rec({ story_id: 's1', day: '2026-11-06' })], ext, DAY);
    expect(v.unchallenged_story).toBeNull();
  });

  it('a complete record on day−14 does not count as tested', () => {
    const ext = counts(['s1', 'money worries', 3]);
    const v = ch02SignalValues([rec({ story_id: 's1', day: '2026-11-05' })], ext, DAY);
    expect(v.unchallenged_story).toEqual({ id: 's1', name: 'money worries' });
  });

  it('a draft record does not count as tested', () => {
    const ext = counts(['s1', 'money worries', 3]);
    const v = ch02SignalValues([rec({ story_id: 's1', day: '2026-11-18', complete: 0 })], ext, DAY);
    expect(v.unchallenged_story).toEqual({ id: 's1', name: 'money worries' });
  });

  it('the highest count wins', () => {
    const ext = counts(['s1', 'alpha', 4], ['s2', 'beta', 5]);
    expect(ch02SignalValues([], ext, DAY).unchallenged_story).toEqual({ id: 's2', name: 'beta' });
  });

  it('ties on count are broken by name', () => {
    const ext = counts(['s1', 'beta', 4], ['s2', 'alpha', 4]);
    expect(ch02SignalValues([], ext, DAY).unchallenged_story).toEqual({ id: 's2', name: 'alpha' });
  });

  it('skips a tested story and picks the next eligible one', () => {
    const ext = counts(['s1', 'alpha', 5], ['s2', 'beta', 3]);
    const v = ch02SignalValues([rec({ story_id: 's1', day: '2026-11-17' })], ext, DAY);
    expect(v.unchallenged_story).toEqual({ id: 's2', name: 'beta' });
  });

  it('is undefined when story_counts_7d is present but not an array', () => {
    const ext: Signals = { 'ch01.story_counts_7d': 'nope' };
    expect(ch02SignalValues([], ext, DAY).unchallenged_story).toBeUndefined();
  });
});

describe('unchallengedStory helper', () => {
  it('is undefined when absent or null', () => {
    expect(unchallengedStory({})).toBeUndefined();
    expect(unchallengedStory({ 'ch02.unchallenged_story': null })).toBeUndefined();
  });

  it('is undefined for a non-object or an empty name', () => {
    expect(unchallengedStory({ 'ch02.unchallenged_story': 'money worries' })).toBeUndefined();
    expect(unchallengedStory({ 'ch02.unchallenged_story': { id: 's1', name: '' } })).toBeUndefined();
    expect(unchallengedStory({ 'ch02.unchallenged_story': { id: 's1' } })).toBeUndefined();
  });

  it('returns {id, name} for a valid object', () => {
    expect(unchallengedStory({ 'ch02.unchallenged_story': { id: 's1', name: 'money worries', extra: 1 } })).toEqual({
      id: 's1',
      name: 'money worries',
    });
  });
});

describe('storyTrend helper', () => {
  it('is empty when absent', () => {
    expect(storyTrend({})).toEqual([]);
  });

  it('drops malformed entries and keeps valid ones', () => {
    const valid = { story_id: 's1', name: 'money worries', first_before: 80, last_after: 40, n: 3 };
    const s: Signals = {
      'ch02.story_trend': [
        valid,
        null,
        'x',
        { story_id: 's2', name: 'x', first_before: '80', last_after: 40, n: 3 },
        { story_id: 's3', name: 'x', first_before: 80, last_after: 40 },
        { name: 'x', first_before: 80, last_after: 40, n: 3 },
      ],
    };
    expect(storyTrend(s)).toEqual([valid]);
  });
});

describe('recordsNavCount helper', () => {
  it('is null when the signal is absent or zero', () => {
    expect(recordsNavCount({})).toBeNull();
    expect(recordsNavCount({ 'ch02.records_7d': 0 })).toBeNull();
  });

  it('returns the count when positive', () => {
    expect(recordsNavCount({ 'ch02.records_7d': 3 })).toBe(3);
  });
});

describe('startCardVisible', () => {
  it('is always true while ch02 is active', () => {
    expect(startCardVisible({})).toBe(true);
  });
});
