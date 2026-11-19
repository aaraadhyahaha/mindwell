import { describe, expect, it } from 'vitest';
import type { Signals, Suggestion } from '@mindwell/core';
import { suggestions, WEAKENING_DROP } from './suggestions';

const DAY = '2026-11-19';
const ctx = { day: DAY };
const rule = (id: string) => {
  const r = suggestions.find((x) => x.id === id);
  if (!r) throw new Error(`no rule ${id}`);
  return r;
};
const weakening = rule('ch02.weakening');
const untested = rule('ch02.untested');

const trend = (over: Partial<{ story_id: string; name: string; first_before: number; last_after: number; n: number }> = {}) => ({
  story_id: 's1',
  name: 'money worries',
  first_before: 80,
  last_after: 50,
  n: 3,
  ...over,
});
const at = (...rows: unknown[]): Signals => ({ 'ch02.story_trend': rows as Signals[string][] });

describe('ch02.weakening', () => {
  it('uses a threshold of 30 points', () => {
    expect(WEAKENING_DROP).toBe(30);
  });

  it('fires at exactly a 30-point drop over 3 records (80 → 50)', () => {
    const s: Suggestion | null = weakening.evaluate(at(trend()), ctx);
    expect(s).not.toBeNull();
    expect(s!.key).toBe(`ch02.weakening:s1:${DAY}`);
  });

  it('has the exact evidence text', () => {
    const s = weakening.evaluate(at(trend()), ctx);
    expect(s!.text).toBe("'money worries' went from 80 to 50 across 3 records.");
  });

  it('does not fire at a 29-point drop (80 → 51)', () => {
    expect(weakening.evaluate(at(trend({ last_after: 51 })), ctx)).toBeNull();
  });

  it('does not fire with n = 2 even when the drop is 60', () => {
    expect(weakening.evaluate(at(trend({ n: 2, last_after: 20 })), ctx)).toBeNull();
  });

  it('fires for a larger drop with more records', () => {
    const s = weakening.evaluate(at(trend({ n: 5, last_after: 10 })), ctx);
    expect(s!.text).toBe("'money worries' went from 80 to 10 across 5 records.");
  });

  it('returns the first qualifying story in trend order', () => {
    const s = weakening.evaluate(
      at(
        trend({ story_id: 's1', name: 'alpha', last_after: 70 }),
        trend({ story_id: 's2', name: 'beta', last_after: 20 }),
        trend({ story_id: 's3', name: 'gamma', last_after: 10 }),
      ),
      ctx,
    );
    expect(s!.key).toBe(`ch02.weakening:s2:${DAY}`);
  });

  it('returns null when story_trend is absent or empty', () => {
    expect(weakening.evaluate({}, ctx)).toBeNull();
    expect(weakening.evaluate(at(), ctx)).toBeNull();
  });

  it('ignores malformed trend entries', () => {
    expect(weakening.evaluate(at({ story_id: 's1', name: 'x', first_before: 80, n: 3 }), ctx)).toBeNull();
    expect(weakening.evaluate(at(null, 'x'), ctx)).toBeNull();
  });
});

describe('ch02.untested', () => {
  const unchallenged = (over: Partial<{ id: string; name: string }> = {}): Signals => ({
    'ch02.unchallenged_story': { id: 's1', name: 'money worries', ...over },
  });

  it('fires when unchallenged_story is set, with the exact text', () => {
    const s = untested.evaluate(unchallenged(), ctx);
    expect(s).not.toBeNull();
    expect(s!.text).toBe("'money worries' keeps coming up but hasn't been tested. Do one record this week?");
    expect(s!.key).toBe(`ch02.untested:s1:${DAY}`);
  });

  it('returns null when unchallenged_story is null', () => {
    expect(untested.evaluate({ 'ch02.unchallenged_story': null }, ctx)).toBeNull();
  });

  it('returns null when ch01 is inactive (key absent)', () => {
    expect(untested.evaluate({}, ctx)).toBeNull();
  });

  it('returns null for a malformed unchallenged_story (empty name)', () => {
    expect(untested.evaluate(unchallenged({ name: '' }), ctx)).toBeNull();
  });
});
