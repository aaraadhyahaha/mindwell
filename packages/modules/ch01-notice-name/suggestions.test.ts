import { describe, expect, it } from 'vitest';
import type { Signals, Suggestion } from '@mindwell/core';
import { suggestions } from './suggestions';

const DAY = '2026-11-19';
const ctx = { day: DAY };
const rule = (id: string) => {
  const r = suggestions.find((x) => x.id === id);
  if (!r) throw new Error(`no rule ${id}`);
  return r;
};
const unlinked = rule('ch01.unlinked');
const fading = rule('ch01.fading');

const fort = (id: string, name: string, current: number, previous: number) => ({ id, name, current, previous });

describe('ch01.unlinked', () => {
  it('fires at exactly 5 unlinked captures, with the count in the text', () => {
    const s: Suggestion | null = unlinked.evaluate({ 'ch01.unlinked_7d': 5 }, ctx);
    expect(s).not.toBeNull();
    expect(s!.text).toContain('5 captures');
    expect(s!.reason).toContain('5 thoughts');
  });

  it('does not fire at 4', () => {
    expect(unlinked.evaluate({ 'ch01.unlinked_7d': 4 }, ctx)).toBeNull();
  });

  it('shows the real count when it is larger', () => {
    const s = unlinked.evaluate({ 'ch01.unlinked_7d': 12 }, ctx);
    expect(s!.text).toContain('12 captures');
  });

  it('keys the suggestion by day', () => {
    expect(unlinked.evaluate({ 'ch01.unlinked_7d': 6 }, ctx)!.key).toBe(`ch01.unlinked:${DAY}`);
  });

  it('returns null when the signal is missing, null or not finite', () => {
    expect(unlinked.evaluate({}, ctx)).toBeNull();
    expect(unlinked.evaluate({ 'ch01.unlinked_7d': null }, ctx)).toBeNull();
    expect(unlinked.evaluate({ 'ch01.unlinked_7d': Number.NaN }, ctx)).toBeNull();
  });
});

describe('ch01.fading', () => {
  const at = (...rows: unknown[]): Signals => ({ 'ch01.story_fortnights': rows as Signals[string][] });

  it('fires when previous ≥ 4 and current is exactly half of previous', () => {
    const s = fading.evaluate(at(fort('s1', 'money worries', 2, 4)), ctx);
    expect(s).not.toBeNull();
    expect(s!.key).toBe(`ch01.fading:s1:${DAY}`);
  });

  it('fires when current is below half of previous', () => {
    expect(fading.evaluate(at(fort('s1', 'money worries', 0, 4)), ctx)).not.toBeNull();
    expect(fading.evaluate(at(fort('s1', 'money worries', 4, 9)), ctx)).not.toBeNull();
  });

  it('does not fire when current is just above half (3 of 4)', () => {
    expect(fading.evaluate(at(fort('s1', 'money worries', 3, 4)), ctx)).toBeNull();
  });

  it('does not fire when previous is 3 (below the minimum of 4)', () => {
    expect(fading.evaluate(at(fort('s1', 'money worries', 0, 3)), ctx)).toBeNull();
  });

  it('uses evidence-only text with the name and both counts', () => {
    const s = fading.evaluate(at(fort('s1', 'money worries', 2, 6)), ctx) as Suggestion;
    expect(s.text).toBe("'money worries' showed up half as often this fortnight.");
    expect(s.reason).toBe('2 captures in the last 14 days, against 6 in the 14 before.');
  });

  it('takes the first qualifying story in list order', () => {
    const s = fading.evaluate(
      at(fort('s1', 'money worries', 9, 10), fort('s2', 'work deadline', 0, 8)),
      ctx,
    );
    expect(s!.key).toBe(`ch01.fading:s2:${DAY}`);
  });

  it('skips malformed rows and returns null when nothing qualifies', () => {
    const s = fading.evaluate(
      at(null, 'x', { id: 's1', name: 'a', current: null, previous: 8 }, fort('s2', 'work deadline', 5, 8)),
      ctx,
    );
    expect(s).toBeNull();
  });

  it('returns null for empty or missing data', () => {
    expect(fading.evaluate(at(), ctx)).toBeNull();
    expect(fading.evaluate({}, ctx)).toBeNull();
    expect(fading.evaluate({ 'ch01.story_fortnights': null }, ctx)).toBeNull();
  });
});
