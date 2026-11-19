import { describe, expect, it } from 'vitest';
import type { Signals } from '@mindwell/core';
import { suggestions } from './suggestions';

const low = suggestions.find((s) => s.id === 'intro.low_ratings')!;
const tryNew = suggestions.find((s) => s.id === 'intro.try_new')!;

const ctx = (day: string) => ({ day }) as never;

const active = (over: Record<string, unknown> & { id: string }) => ({
  module: 'm1',
  technique: 't1',
  label: 'Walks',
  start_day: '2026-11-01',
  end_day: '2026-11-14',
  days_left: 5,
  recent_ratings: [] as number[],
  ...over,
});

describe('intro.low_ratings', () => {
  it('fires when the last two ratings are both <= 2', () => {
    const s: Signals = { 'intro.active': [active({ id: 'e1', recent_ratings: [2, 1] })] };
    const out = low.evaluate(s, ctx('2026-11-10'));
    expect(out?.key).toBe('intro.low_ratings:e1');
    expect(out?.text).toBe("Walks hasn't been helping for two weeks. End it early?");
    expect(out?.reason).toBe('Your last two weekly check-ins rated it 2 and 1 out of 5.');
  });

  it('fires at the boundary of 2 and 2', () => {
    const s: Signals = { 'intro.active': [active({ id: 'e1', recent_ratings: [2, 2] })] };
    expect(low.evaluate(s, ctx('2026-11-10'))?.key).toBe('intro.low_ratings:e1');
  });

  it('does not fire when one rating is 3', () => {
    const s: Signals = { 'intro.active': [active({ id: 'e1', recent_ratings: [2, 3] })] };
    expect(low.evaluate(s, ctx('2026-11-10'))).toBeNull();
  });

  it('does not fire with only one rating', () => {
    const s: Signals = { 'intro.active': [active({ id: 'e1', recent_ratings: [1] })] };
    expect(low.evaluate(s, ctx('2026-11-10'))).toBeNull();
  });

  it('does not fire with no ratings', () => {
    const s: Signals = { 'intro.active': [active({ id: 'e1', recent_ratings: [] })] };
    expect(low.evaluate(s, ctx('2026-11-10'))).toBeNull();
  });

  it('returns null with no intro.active signal', () => {
    expect(low.evaluate({}, ctx('2026-11-10'))).toBeNull();
  });

  it('returns null with an empty active list', () => {
    expect(low.evaluate({ 'intro.active': [] }, ctx('2026-11-10'))).toBeNull();
  });

  it('takes the first qualifying experiment in list order', () => {
    const s: Signals = {
      'intro.active': [
        active({ id: 'ok', recent_ratings: [5, 4] }),
        active({ id: 'first-low', recent_ratings: [1, 1] }),
        active({ id: 'second-low', recent_ratings: [2, 2], label: 'Other' }),
      ],
    };
    expect(low.evaluate(s, ctx('2026-11-10'))?.key).toBe('intro.low_ratings:first-low');
  });

  it('skips entries that are not objects', () => {
    const s: Signals = { 'intro.active': [null, 'x', active({ id: 'e1', recent_ratings: [1, 2] })] };
    expect(low.evaluate(s, ctx('2026-11-10'))?.key).toBe('intro.low_ratings:e1');
  });

  it('has a stable key for the same experiment across calls', () => {
    const s: Signals = { 'intro.active': [active({ id: 'e1', recent_ratings: [1, 1] })] };
    const a = low.evaluate(s, ctx('2026-11-10'));
    const b = low.evaluate(s, ctx('2026-11-11'));
    expect(a?.key).toBe(b?.key);
  });
});

describe('intro.try_new', () => {
  const day = '2026-11-19';
  // 7 days before 2026-11-19 is 2026-11-12

  it('fires when a chapter was read exactly 7 days ago', () => {
    const s: Signals = {
      'chapters.read': [{ module: 'm1', chapter: 2, read_day: '2026-11-12' }],
      'experiments.available': [{ module: 'm1', technique: 't', label: 'T', default_days: 7 }],
      'intro.modules_tried': [],
    };
    const out = tryNew.evaluate(s, ctx(day));
    expect(out?.key).toBe('intro.try_new:m1');
    expect(out?.text).toBe('You unlocked Chapter 2 a week ago. Try one of its techniques as an experiment?');
  });

  it('does not fire when a chapter was read 6 days ago', () => {
    const s: Signals = {
      'chapters.read': [{ module: 'm1', chapter: 2, read_day: '2026-11-13' }],
      'experiments.available': [{ module: 'm1', technique: 't', label: 'T', default_days: 7 }],
      'intro.modules_tried': [],
    };
    expect(tryNew.evaluate(s, ctx(day))).toBeNull();
  });

  it('does not fire for a read on the same day', () => {
    const s: Signals = {
      'chapters.read': [{ module: 'm1', chapter: 2, read_day: day }],
      'experiments.available': [{ module: 'm1', technique: 't', label: 'T', default_days: 7 }],
      'intro.modules_tried': [],
    };
    expect(tryNew.evaluate(s, ctx(day))).toBeNull();
  });

  it('skips modules already tried', () => {
    const s: Signals = {
      'chapters.read': [{ module: 'm1', chapter: 1, read_day: '2026-11-01' }],
      'experiments.available': [{ module: 'm1', technique: 't', label: 'T', default_days: 7 }],
      'intro.modules_tried': ['m1'],
    };
    expect(tryNew.evaluate(s, ctx(day))).toBeNull();
  });

  it('skips modules with no experiments on offer', () => {
    const s: Signals = {
      'chapters.read': [
        { module: 'm1', chapter: 1, read_day: '2026-11-01' },
        { module: 'm2', chapter: 2, read_day: '2026-11-01' },
      ],
      'experiments.available': [{ module: 'm2', technique: 't', label: 'T', default_days: 7 }],
      'intro.modules_tried': [],
    };
    expect(tryNew.evaluate(s, ctx(day))?.key).toBe('intro.try_new:m2');
  });

  it('returns null when no module has experiments on offer', () => {
    const s: Signals = {
      'chapters.read': [{ module: 'm1', chapter: 1, read_day: '2026-11-01' }],
      'experiments.available': [],
      'intro.modules_tried': [],
    };
    expect(tryNew.evaluate(s, ctx(day))).toBeNull();
  });

  it('picks the lowest chapter number among eligible reads', () => {
    const s: Signals = {
      'chapters.read': [
        { module: 'm3', chapter: 5, read_day: '2026-11-01' },
        { module: 'm1', chapter: 2, read_day: '2026-11-01' },
        { module: 'm2', chapter: 4, read_day: '2026-11-01' },
      ],
      'experiments.available': [
        { module: 'm1', technique: 't', label: 'T', default_days: 7 },
        { module: 'm2', technique: 't', label: 'T', default_days: 7 },
        { module: 'm3', technique: 't', label: 'T', default_days: 7 },
      ],
      'intro.modules_tried': [],
    };
    const out = tryNew.evaluate(s, ctx(day));
    expect(out?.key).toBe('intro.try_new:m1');
    expect(out?.text).toContain('Chapter 2 ');
  });

  it('does not let a too-recent low chapter block an eligible higher one', () => {
    const s: Signals = {
      'chapters.read': [
        { module: 'm1', chapter: 1, read_day: '2026-11-18' },
        { module: 'm2', chapter: 3, read_day: '2026-11-01' },
      ],
      'experiments.available': [
        { module: 'm1', technique: 't', label: 'T', default_days: 7 },
        { module: 'm2', technique: 't', label: 'T', default_days: 7 },
      ],
      'intro.modules_tried': [],
    };
    expect(tryNew.evaluate(s, ctx(day))?.key).toBe('intro.try_new:m2');
  });

  it('returns null with no signals', () => {
    expect(tryNew.evaluate({}, ctx(day))).toBeNull();
  });

  it('returns null with empty chapters.read', () => {
    expect(
      tryNew.evaluate({ 'chapters.read': [], 'experiments.available': [], 'intro.modules_tried': [] }, ctx(day)),
    ).toBeNull();
  });
});
