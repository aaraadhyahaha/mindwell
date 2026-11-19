import { describe, expect, it } from 'vitest';
import type { Signals } from '@mindwell/core';
import { ch01SignalValues, eveningCardVisible, thoughtsNavCount, type CaptureRow, type StoryRow } from './signals';

const DAY = '2026-11-19';
const stories: StoryRow[] = [
  { id: 's1', name: 'money worries' },
  { id: 's2', name: 'work deadline' },
  { id: 's3', name: 'family' },
];
const cap = (story_id: string | null, day: string): CaptureRow => ({ story_id, day });

describe('ch01SignalValues: basics', () => {
  it('returns empty values for no data', () => {
    const v = ch01SignalValues([], [], DAY);
    expect(v).toEqual({
      captures_today: 0,
      captures_yesterday: 0,
      top_story_7d: null,
      story_counts_7d: [],
      repeating_story: null,
      unlinked_7d: 0,
      story_fortnights: [],
    });
  });

  it('counts captures_today and captures_yesterday by exact day, linked or not', () => {
    const captures = [
      cap('s1', DAY),
      cap(null, DAY),
      cap('s2', '2026-11-18'),
      cap(null, '2026-11-18'),
      cap('s1', '2026-11-17'),
    ];
    const v = ch01SignalValues(stories, captures, DAY);
    expect(v.captures_today).toBe(2);
    expect(v.captures_yesterday).toBe(2);
  });

  it('does not count a capture from two days ago as yesterday', () => {
    const v = ch01SignalValues(stories, [cap('s1', '2026-11-17')], DAY);
    expect(v.captures_yesterday).toBe(0);
  });
});

describe('ch01SignalValues: 7-day window', () => {
  it('includes day−6 and excludes day−7', () => {
    const captures = [cap('s1', '2026-11-13'), cap('s2', '2026-11-12')];
    const v = ch01SignalValues(stories, captures, DAY);
    expect(v.story_counts_7d).toEqual([{ id: 's1', name: 'money worries', count: 1 }]);
    expect(v.unlinked_7d).toBe(0);
  });

  it('includes day itself and counts unlinked captures inside the window only', () => {
    const captures = [cap(null, DAY), cap(null, '2026-11-13'), cap(null, '2026-11-12')];
    expect(ch01SignalValues([], captures, DAY).unlinked_7d).toBe(2);
  });

  it('ignores captures after day', () => {
    const v = ch01SignalValues(stories, [cap('s1', '2026-11-20'), cap(null, '2026-11-20')], DAY);
    expect(v.story_counts_7d).toEqual([]);
    expect(v.unlinked_7d).toBe(0);
  });
});

describe('ch01SignalValues: top_story_7d and story_counts_7d', () => {
  it('is null with no linked captures in the window', () => {
    const v = ch01SignalValues(stories, [cap(null, DAY), cap(null, '2026-11-14')], DAY);
    expect(v.top_story_7d).toBeNull();
    expect(v.story_counts_7d).toEqual([]);
  });

  it('picks the story with the most captures', () => {
    const captures = [cap('s2', DAY), cap('s1', DAY), cap('s1', '2026-11-18')];
    const v = ch01SignalValues(stories, captures, DAY);
    expect(v.top_story_7d).toEqual({ id: 's1', name: 'money worries', count: 2 });
    expect(v.story_counts_7d.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('breaks a count tie by name, not by id or order', () => {
    const tieStories: StoryRow[] = [
      { id: 'a', name: 'Zebra' },
      { id: 'z', name: 'Apple' },
    ];
    const captures = [cap('a', DAY), cap('z', DAY)];
    const v = ch01SignalValues(tieStories, captures, DAY);
    expect(v.top_story_7d?.name).toBe('Apple');
    expect(v.story_counts_7d.map((s) => s.name)).toEqual(['Apple', 'Zebra']);
  });

  it('ignores captures whose story id is unknown', () => {
    const captures = [cap('ghost', DAY), cap('ghost', DAY), cap('ghost', DAY), cap('s3', DAY)];
    const v = ch01SignalValues(stories, captures, DAY);
    expect(v.top_story_7d).toEqual({ id: 's3', name: 'family', count: 1 });
    expect(v.story_counts_7d.some((s) => s.id === 'ghost')).toBe(false);
    expect(v.unlinked_7d).toBe(0);
  });

  it('is null when the only linked captures have unknown story ids', () => {
    const v = ch01SignalValues(stories, [cap('ghost', DAY)], DAY);
    expect(v.top_story_7d).toBeNull();
  });
});

describe('ch01SignalValues: repeating_story', () => {
  const days = (n: number): string[] => {
    // n distinct days ending at DAY, all inside the 7-day window.
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(`2026-11-${String(19 - i).padStart(2, '0')}`);
    return out;
  };

  it('is set when a story has captures on 5 of the 7 days', () => {
    const captures = days(5).map((d) => cap('s1', d));
    const v = ch01SignalValues(stories, captures, DAY);
    expect(v.repeating_story).toEqual({ id: 's1', name: 'money worries', days: 5 });
  });

  it('is null when a story has captures on only 4 days', () => {
    const captures = days(4).map((d) => cap('s1', d));
    expect(ch01SignalValues(stories, captures, DAY).repeating_story).toBeNull();
  });

  it('counts several captures on one day once', () => {
    const captures = [
      cap('s1', '2026-11-19'),
      cap('s1', '2026-11-19'),
      cap('s1', '2026-11-19'),
      cap('s1', '2026-11-18'),
      cap('s1', '2026-11-17'),
      cap('s1', '2026-11-17'),
      cap('s1', '2026-11-16'),
    ];
    // 7 captures but only 4 distinct days.
    expect(ch01SignalValues(stories, captures, DAY).repeating_story).toBeNull();
  });

  it('does not count a day outside the window', () => {
    // 4 days inside the window plus one on day−7, which must not count.
    const captures = [...days(4).map((d) => cap('s1', d)), cap('s1', '2026-11-12')];
    expect(ch01SignalValues(stories, captures, DAY).repeating_story).toBeNull();
  });

  it('is null when there are no captures', () => {
    expect(ch01SignalValues(stories, [], DAY).repeating_story).toBeNull();
  });
});

describe('ch01SignalValues: unlinked_7d', () => {
  it('counts unlinked captures in the window', () => {
    const captures = [cap(null, DAY), cap(null, '2026-11-15'), cap('s1', DAY)];
    expect(ch01SignalValues(stories, captures, DAY).unlinked_7d).toBe(2);
  });
});

describe('ch01SignalValues: story_fortnights', () => {
  it('current covers day−13…day and previous covers day−27…day−14', () => {
    const captures = [
      cap('s1', DAY), // current
      cap('s1', '2026-11-06'), // day−13, current
      cap('s1', '2026-11-05'), // day−14, previous
      cap('s1', '2026-10-23'), // day−27, previous
    ];
    const [row] = ch01SignalValues(stories, captures, DAY).story_fortnights;
    expect(row).toEqual({ id: 's1', name: 'money worries', current: 2, previous: 2 });
  });

  it('excludes day−28 and older from both windows', () => {
    const captures = [cap('s1', '2026-10-22'), cap('s1', '2026-10-01')];
    expect(ch01SignalValues(stories, captures, DAY).story_fortnights).toEqual([]);
  });

  it('excludes captures after day from current', () => {
    const captures = [cap('s1', '2026-11-20')];
    expect(ch01SignalValues(stories, captures, DAY).story_fortnights).toEqual([]);
  });

  it('lists a story with only previous captures (current 0) and omits stories with none', () => {
    const captures = [cap('s2', '2026-11-01')];
    expect(ch01SignalValues(stories, captures, DAY).story_fortnights).toEqual([
      { id: 's2', name: 'work deadline', current: 0, previous: 1 },
    ]);
  });

  it('sorts by previous count desc, then name', () => {
    const captures = [
      cap('s1', '2026-11-01'),
      cap('s3', '2026-11-01'),
      cap('s3', '2026-11-02'),
      cap('s2', DAY),
    ];
    const rows = ch01SignalValues(stories, captures, DAY).story_fortnights;
    expect(rows.map((r) => r.id)).toEqual(['s3', 's1', 's2']);
  });

  it('ignores captures with unknown story ids', () => {
    const captures = [cap('ghost', DAY)];
    expect(ch01SignalValues(stories, captures, DAY).story_fortnights).toEqual([]);
  });
});

describe('eveningCardVisible', () => {
  const s = (v: unknown): Signals => ({ 'ch01.captures_today': v as Signals[string] });

  it('is true when something was captured today', () => {
    expect(eveningCardVisible(s(1))).toBe(true);
  });

  it('is false at exactly zero captures', () => {
    expect(eveningCardVisible(s(0))).toBe(false);
  });

  it('is false when the signal is missing, null or not finite', () => {
    expect(eveningCardVisible({})).toBe(false);
    expect(eveningCardVisible(s(null))).toBe(false);
    expect(eveningCardVisible(s(Number.NaN))).toBe(false);
  });
});

describe('thoughtsNavCount', () => {
  it('counts linked and unlinked captures from the last 7 days', () => {
    const s: Signals = {
      'ch01.story_counts_7d': [
        { id: 'a', name: "I'll fail", count: 4 },
        { id: 'b', name: 'Not good enough', count: 2 },
      ],
      'ch01.unlinked_7d': 1,
    };
    expect(thoughtsNavCount(s)).toBe(7);
  });
  it('is null when there is nothing this week or the signals are missing', () => {
    expect(thoughtsNavCount({ 'ch01.story_counts_7d': [], 'ch01.unlinked_7d': 0 })).toBeNull();
    expect(thoughtsNavCount({})).toBeNull();
  });
  it('ignores malformed entries', () => {
    expect(thoughtsNavCount({ 'ch01.story_counts_7d': [{ id: 'a' }, 'x', 3], 'ch01.unlinked_7d': 2 })).toBe(2);
  });
});
