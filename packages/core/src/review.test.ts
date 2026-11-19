import { describe, expect, it } from 'vitest';
import type { Module } from './module';
import type { Signals, SuggestionRule } from './prompts';
import type { DayRecord } from './records';
import { REVIEW_DAYS, evaluateSuggestions, reviewWeek, weekSummary } from './review';

function mod(id: string, suggestions: SuggestionRule[] = []): Module<unknown> {
  return {
    manifest: { id, chapter: 1, title: id, idea: '', evidence: '', references: [] },
    migrations: [], screens: [], todayCards: [], prompts: [], signals: [],
    reviewSections: [], suggestions, experiments: [],
  };
}

const rule = (id: string, key: string | null, text = 't'): SuggestionRule => ({
  id,
  evaluate: () => (key === null ? null : { key, text, reason: 'r' }),
});

type Row = Pick<DayRecord, 'day' | 'rating' | 'intent_result' | 'checkin_at' | 'closed_at'>;
const row = (day: string, extra: Partial<Row> = {}): Row => ({
  day, rating: null, intent_result: null, checkin_at: null, closed_at: null, ...extra,
});

const signals: Signals = {};

describe('reviewWeek', () => {
  it('returns REVIEW_DAYS days ending on the given day, oldest first', () => {
    expect(REVIEW_DAYS).toBe(7);
    expect(reviewWeek('2026-11-19')).toEqual([
      '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19',
    ]);
  });

  it('crosses a month boundary', () => {
    expect(reviewWeek('2026-11-03')).toEqual([
      '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03',
    ]);
  });

  it('crosses a year boundary', () => {
    expect(reviewWeek('2027-01-02')[0]).toBe('2026-12-27');
    expect(reviewWeek('2027-01-02')[6]).toBe('2027-01-02');
  });
});

describe('weekSummary', () => {
  const day = '2026-11-19';

  it('returns zeros, null mean and all-null ratings for empty data', () => {
    expect(weekSummary(day, [])).toEqual({
      checkins: 0,
      closes: 0,
      intents: { kept: 0, partly: 0, not: 0 },
      meanRating: null,
      ratings: [null, null, null, null, null, null, null],
    });
  });

  it('ignores rows outside the week', () => {
    const rows = [
      row('2026-11-12', { rating: 5, checkin_at: 'x', closed_at: 'x', intent_result: 'kept' }),
      row('2026-11-20', { rating: 5, checkin_at: 'x', closed_at: 'x', intent_result: 'kept' }),
    ];
    const s = weekSummary(day, rows);
    expect(s.checkins).toBe(0);
    expect(s.closes).toBe(0);
    expect(s.intents).toEqual({ kept: 0, partly: 0, not: 0 });
    expect(s.meanRating).toBeNull();
  });

  it('includes the first and last day of the week', () => {
    const s = weekSummary(day, [row('2026-11-13', { rating: 4 }), row('2026-11-19', { rating: 2 })]);
    expect(s.ratings).toEqual([4, null, null, null, null, null, 2]);
    expect(s.meanRating).toBe(3);
  });

  it('counts check-ins, closes and intent results', () => {
    const rows = [
      row('2026-11-14', { checkin_at: '2026-11-14T08:00:00.000Z', closed_at: '2026-11-14T21:00:00.000Z', intent_result: 'kept' }),
      row('2026-11-15', { checkin_at: '2026-11-15T08:00:00.000Z', intent_result: 'partly' }),
      row('2026-11-16', { closed_at: '2026-11-16T21:00:00.000Z', intent_result: 'not' }),
      row('2026-11-17', { checkin_at: '2026-11-17T08:00:00.000Z', intent_result: 'kept' }),
    ];
    const s = weekSummary(day, rows);
    expect(s.checkins).toBe(3);
    expect(s.closes).toBe(2);
    expect(s.intents).toEqual({ kept: 2, partly: 1, not: 1 });
  });

  it('computes the mean over rated days only', () => {
    const rows = [row('2026-11-14', { rating: 5 }), row('2026-11-15', { rating: null }), row('2026-11-16', { rating: 2 })];
    const s = weekSummary(day, rows);
    expect(s.meanRating).toBeCloseTo(3.5);
    expect(s.ratings).toEqual([null, 5, null, 2, null, null, null]);
  });

  it('returns null mean when no day is rated', () => {
    const s = weekSummary(day, [row('2026-11-14'), row('2026-11-15', { checkin_at: 'x' })]);
    expect(s.meanRating).toBeNull();
    expect(s.checkins).toBe(1);
  });

  it('keeps ratings aligned with reviewWeek, oldest first', () => {
    const week = reviewWeek(day);
    const s = weekSummary(day, [row(week[2]!, { rating: 1 }), row(week[5]!, { rating: 3 })]);
    expect(s.ratings).toHaveLength(week.length);
    expect(s.ratings).toEqual([null, null, 1, null, null, 3, null]);
  });
});

describe('evaluateSuggestions', () => {
  it('collects proposals with rule_id and module attached and passes the day through', () => {
    let seenDay: string | undefined;
    const r: SuggestionRule = {
      id: 'r1',
      evaluate: (_s, ctx) => {
        seenDay = ctx.day;
        return { key: 'k1', text: 'hello', reason: 'because' };
      },
    };
    const out = evaluateSuggestions([mod('ch01', [r])], signals, '2026-11-19', new Set());
    expect(seenDay).toBe('2026-11-19');
    expect(out.failed).toEqual([]);
    expect(out.proposed).toEqual([{ key: 'k1', text: 'hello', reason: 'because', rule_id: 'r1', module: 'ch01' }]);
  });

  it('skips null results', () => {
    const out = evaluateSuggestions([mod('ch01', [rule('r1', null), rule('r2', 'k2')])], signals, 'd', new Set());
    expect(out.proposed.map((p) => p.key)).toEqual(['k2']);
  });

  it('returns nothing for no modules or no rules', () => {
    expect(evaluateSuggestions([], signals, 'd', new Set())).toEqual({ proposed: [], failed: [] });
    expect(evaluateSuggestions([mod('ch01')], signals, 'd', new Set()).proposed).toEqual([]);
  });

  it('skips keys in excludeKeys', () => {
    const out = evaluateSuggestions([mod('ch01', [rule('r1', 'a'), rule('r2', 'b')])], signals, 'd', new Set(['a']));
    expect(out.proposed.map((p) => p.key)).toEqual(['b']);
  });

  it('keeps the first rule when two rules share a key (module order)', () => {
    const out = evaluateSuggestions(
      [mod('ch01', [rule('first', 'same', 'A')]), mod('ch02', [rule('second', 'same', 'B')])],
      signals, 'd', new Set(),
    );
    expect(out.proposed).toHaveLength(1);
    expect(out.proposed[0]).toMatchObject({ rule_id: 'first', module: 'ch01', text: 'A' });
  });

  it('records a throwing rule as failed and still runs the others', () => {
    const boom = new Error('boom');
    const bad: SuggestionRule = { id: 'bad', evaluate: () => { throw boom; } };
    const out = evaluateSuggestions([mod('ch01', [bad, rule('ok', 'k')])], signals, 'd', new Set());
    expect(out.failed).toEqual([{ module: 'ch01', rule_id: 'bad', error: boom }]);
    expect(out.proposed.map((p) => p.key)).toEqual(['k']);
  });
});
