import { describe, expect, it } from 'vitest';
import type { Signals, SuggestionRule } from '@mindwell/core';
import { REFRAME_MIN_EVENTS, REFRAME_MIN_RATE, suggestions } from './suggestions';

const DAY = '2026-11-20';
const rule = (id: string): SuggestionRule => {
  const r = suggestions.find((x) => x.id === id);
  if (!r) throw new Error(`no rule ${id}`);
  return r;
};
const reframe = rule('ch03.reframe_works');
const mood = rule('ch03.series_mood');

const counts = (helped: number, rated: number): Signals => ({ 'ch03.reframe_counts': { helped, rated } });
const moods = (...rows: Array<{ id?: string; topic?: string; last_day: string; avg_before: number; avg_after: number; n?: number }>): Signals => ({
  'ch03.series_moods': rows.map((r) => ({ id: 's1', topic: 'money', n: 3, ...r })),
});

describe('ch03.reframe_works', () => {
  it('thresholds are 3 events and 0.66', () => {
    expect(REFRAME_MIN_EVENTS).toBe(3);
    expect(REFRAME_MIN_RATE).toBe(0.66);
  });

  it('fires at 2 of 3 with the spec text and a key that names the count and day', () => {
    const s = reframe.evaluate(counts(2, 3), { day: DAY });
    expect(s).not.toBeNull();
    expect(s!.text).toBe('Reframing nerves as excitement helped in 2 of 3 events.');
    expect(s!.key).toBe(`ch03.reframe_works:3:${DAY}`);
  });

  it('does not fire at 2 rated events, even if both helped', () => {
    expect(reframe.evaluate(counts(2, 2), { day: DAY })).toBeNull();
  });

  it('does not fire at 1 of 3', () => {
    expect(reframe.evaluate(counts(1, 3), { day: DAY })).toBeNull();
  });

  it('rate boundary: 66 of 100 fires, 65 of 100 does not', () => {
    expect(reframe.evaluate(counts(66, 100), { day: DAY })).not.toBeNull();
    expect(reframe.evaluate(counts(65, 100), { day: DAY })).toBeNull();
  });

  it('fires at 3 of 3 and at 3 of 4 (0.75)', () => {
    expect(reframe.evaluate(counts(3, 3), { day: DAY })?.text).toBe('Reframing nerves as excitement helped in 3 of 3 events.');
    expect(reframe.evaluate(counts(3, 4), { day: DAY })?.text).toBe('Reframing nerves as excitement helped in 3 of 4 events.');
  });

  it('does not fire at 2 of 4 (0.5)', () => {
    expect(reframe.evaluate(counts(2, 4), { day: DAY })).toBeNull();
  });

  it('does not fire with no counts signal, or with zero rated', () => {
    expect(reframe.evaluate({}, { day: DAY })).toBeNull();
    expect(reframe.evaluate(counts(0, 0), { day: DAY })).toBeNull();
  });
});

describe('ch03.series_mood', () => {
  const finished = { id: 's1', topic: 'money', last_day: DAY, avg_before: 2, avg_after: 4, n: 3 };

  it('fires for a series whose last day is today, with the spec text and a key per series', () => {
    const s = mood.evaluate(moods(finished), { day: DAY });
    expect(s).not.toBeNull();
    expect(s!.text).toBe("Your writing series on 'money' left you calmer on average.");
    expect(s!.key).toBe('ch03.series_mood:s1');
  });

  it('the key is stable for the same series on a later day', () => {
    const a = mood.evaluate(moods(finished), { day: DAY });
    const b = mood.evaluate(moods(finished), { day: '2026-11-26' });
    expect(a!.key).toBe(b!.key);
  });

  it('review-week window: day−6 fires, day−7 does not', () => {
    expect(mood.evaluate(moods({ ...finished, last_day: '2026-11-14' }), { day: DAY })).not.toBeNull();
    expect(mood.evaluate(moods({ ...finished, last_day: '2026-11-13' }), { day: DAY })).toBeNull();
  });

  it('a last day after the review day does not fire', () => {
    expect(mood.evaluate(moods({ ...finished, last_day: '2026-11-21' }), { day: DAY })).toBeNull();
  });

  it('window crosses a month boundary', () => {
    expect(mood.evaluate(moods({ ...finished, last_day: '2026-11-28' }), { day: '2026-12-02' })).not.toBeNull();
    expect(mood.evaluate(moods({ ...finished, last_day: '2026-11-25' }), { day: '2026-12-02' })).toBeNull();
  });

  it('does not fire when average after is equal to or below average before', () => {
    expect(mood.evaluate(moods({ ...finished, avg_before: 3, avg_after: 3 }), { day: DAY })).toBeNull();
    expect(mood.evaluate(moods({ ...finished, avg_before: 4, avg_after: 3 }), { day: DAY })).toBeNull();
  });

  it('skips a non-qualifying series and fires for the first that qualifies', () => {
    const s = mood.evaluate(
      moods(
        { id: 'flat', topic: 'work', last_day: DAY, avg_before: 3, avg_after: 3 },
        { id: 's2', topic: 'exam', last_day: DAY, avg_before: 2, avg_after: 5 },
      ),
      { day: DAY },
    );
    expect(s!.key).toBe('ch03.series_mood:s2');
    expect(s!.text).toBe("Your writing series on 'exam' left you calmer on average.");
  });

  it('returns null with no series', () => {
    expect(mood.evaluate({}, { day: DAY })).toBeNull();
    expect(mood.evaluate({ 'ch03.series_moods': [] }, { day: DAY })).toBeNull();
  });
});
