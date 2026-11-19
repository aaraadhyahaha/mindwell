import { describe, expect, it } from 'vitest';
import { introSignalValues, midpoint } from './signals';
import type { CheckinRow, ExperimentRow } from './signals';

function exp(over: Partial<ExperimentRow> & { id: string }): ExperimentRow {
  return {
    module: 'm1',
    technique: 't1',
    label: 'Label',
    start_day: '2026-11-01',
    end_day: '2026-11-07',
    status: 'active',
    ...over,
  };
}

function ck(experiment_id: string, day: string, rating: number): CheckinRow {
  return { experiment_id, day, rating };
}

describe('midpoint', () => {
  it('uses floor of half the span for an odd-length experiment', () => {
    // 2026-11-01 .. 2026-11-07 is 7 days, span 6, midpoint offset 3
    expect(midpoint('2026-11-01', '2026-11-07')).toBe('2026-11-04');
  });

  it('uses floor for an even-length experiment', () => {
    // 2026-11-01 .. 2026-11-04 is 4 days, span 3, offset floor(1.5)=1
    expect(midpoint('2026-11-01', '2026-11-04')).toBe('2026-11-02');
  });

  it('equals start for a 2-day experiment', () => {
    expect(midpoint('2026-11-01', '2026-11-02')).toBe('2026-11-01');
  });

  it('equals start for a 1-day experiment', () => {
    expect(midpoint('2026-11-01', '2026-11-01')).toBe('2026-11-01');
  });

  it('handles month rollover', () => {
    // 2026-11-27 .. 2026-12-03, span 6, offset 3 -> 2026-11-30
    expect(midpoint('2026-11-27', '2026-12-03')).toBe('2026-11-30');
  });
});

describe('introSignalValues', () => {
  it('returns empty values with no data', () => {
    expect(introSignalValues([], [], '2026-11-03')).toEqual({
      active: [],
      ending_within_3d: false,
      awaiting_verdict: 0,
      verdict_due: [],
      midpoint_today: null,
      modules_tried: [],
    });
  });

  describe('days_left', () => {
    it('is 0 on the last day', () => {
      const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-07' })], [], '2026-11-07');
      expect(r.active[0]?.days_left).toBe(0);
    });

    it('counts down before the last day', () => {
      const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-07' })], [], '2026-11-04');
      expect(r.active[0]?.days_left).toBe(3);
    });

    it('is negative after the end day', () => {
      const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-07' })], [], '2026-11-09');
      expect(r.active[0]?.days_left).toBe(-2);
    });
  });

  describe('awaiting_verdict and verdict_due', () => {
    it('counts an active experiment whose end_day is today', () => {
      const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-07' })], [], '2026-11-07');
      expect(r.awaiting_verdict).toBe(1);
      expect(r.verdict_due).toEqual([{ id: 'a', technique: 't1', label: 'Label' }]);
    });

    it('counts an active experiment whose end_day is past', () => {
      const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-07' })], [], '2026-11-08');
      expect(r.awaiting_verdict).toBe(1);
    });

    it('does not count an experiment that ends tomorrow', () => {
      const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-07' })], [], '2026-11-06');
      expect(r.awaiting_verdict).toBe(0);
      expect(r.verdict_due).toEqual([]);
    });

    it('does not count an ended experiment even when past its end_day', () => {
      const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-07', status: 'ended' })], [], '2026-11-20');
      expect(r.awaiting_verdict).toBe(0);
      expect(r.verdict_due).toEqual([]);
      expect(r.active).toEqual([]);
    });

    it('orders verdict_due by end_day, not input order', () => {
      const r = introSignalValues(
        [
          exp({ id: 'late', end_day: '2026-11-10', label: 'Late' }),
          exp({ id: 'early', end_day: '2026-11-05', label: 'Early' }),
          exp({ id: 'mid', end_day: '2026-11-08', label: 'Mid' }),
        ],
        [],
        '2026-11-12',
      );
      expect(r.verdict_due.map((d) => d.id)).toEqual(['early', 'mid', 'late']);
      expect(r.awaiting_verdict).toBe(3);
    });
  });

  describe('ending_within_3d', () => {
    const cases: [string, boolean][] = [
      ['2026-11-03', false], // 4 days left
      ['2026-11-04', true], // 3 days left (lower edge of window)
      ['2026-11-07', true], // 0 days left (last day)
      ['2026-11-08', false], // past end: days_left negative
    ];
    for (const [day, expected] of cases) {
      it(`is ${expected} on ${day} for end 2026-11-07`, () => {
        const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-07' })], [], day);
        expect(r.ending_within_3d).toBe(expected);
      });
    }

    it('ignores ended experiments', () => {
      const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-07', status: 'ended' })], [], '2026-11-06');
      expect(r.ending_within_3d).toBe(false);
    });
  });

  describe('midpoint_today', () => {
    it('returns the label on the midpoint day of an odd-length experiment', () => {
      const r = introSignalValues([exp({ id: 'a', label: 'Walks' })], [], '2026-11-04');
      expect(r.midpoint_today).toBe('Walks');
    });

    it('returns the label on the midpoint day of an even-length experiment', () => {
      const r = introSignalValues([exp({ id: 'a', label: 'Walks', end_day: '2026-11-04' })], [], '2026-11-02');
      expect(r.midpoint_today).toBe('Walks');
    });

    it('is null on the end day', () => {
      // 2-day experiment: midpoint is start (11-01); end day 11-02 must not fire
      const r = introSignalValues([exp({ id: 'a', end_day: '2026-11-02' })], [], '2026-11-02');
      expect(r.midpoint_today).toBeNull();
    });

    it('is null on a day that is not the midpoint', () => {
      const r = introSignalValues([exp({ id: 'a' })], [], '2026-11-02');
      expect(r.midpoint_today).toBeNull();
    });

    it('returns the first active experiment (by end_day) whose midpoint is today', () => {
      const r = introSignalValues(
        [
          exp({ id: 'later', label: 'Later', start_day: '2026-11-01', end_day: '2026-11-07' }),
          exp({ id: 'sooner', label: 'Sooner', start_day: '2026-11-01', end_day: '2026-11-05' }),
        ],
        [],
        '2026-11-03',
      );
      // sooner: midpoint 11-01+2 = 11-03 ; later: midpoint 11-04
      expect(r.midpoint_today).toBe('Sooner');
    });

    it('ignores ended experiments', () => {
      const r = introSignalValues([exp({ id: 'a', status: 'ended' })], [], '2026-11-04');
      expect(r.midpoint_today).toBeNull();
    });
  });

  describe('recent_ratings', () => {
    it('is empty with no check-ins', () => {
      const r = introSignalValues([exp({ id: 'a' })], [], '2026-11-03');
      expect(r.active[0]?.recent_ratings).toEqual([]);
    });

    it('holds one rating when there is one check-in', () => {
      const r = introSignalValues([exp({ id: 'a' })], [ck('a', '2026-11-03', 4)], '2026-11-03');
      expect(r.active[0]?.recent_ratings).toEqual([4]);
    });

    it('keeps the last 2 ratings, oldest first, regardless of input order', () => {
      const r = introSignalValues(
        [exp({ id: 'a' })],
        [ck('a', '2026-11-20', 5), ck('a', '2026-11-06', 1), ck('a', '2026-11-13', 2)],
        '2026-11-20',
      );
      expect(r.active[0]?.recent_ratings).toEqual([2, 5]);
    });

    it('does not mix check-ins across experiments', () => {
      const r = introSignalValues(
        [exp({ id: 'a' }), exp({ id: 'b', technique: 't2' })],
        [ck('a', '2026-11-03', 1), ck('b', '2026-11-03', 5), ck('b', '2026-11-04', 4)],
        '2026-11-04',
      );
      expect(r.active.find((e) => e.id === 'a')?.recent_ratings).toEqual([1]);
      expect(r.active.find((e) => e.id === 'b')?.recent_ratings).toEqual([5, 4]);
    });
  });

  describe('active', () => {
    it('lists only active rows, ordered by end_day, with the entry shape', () => {
      const r = introSignalValues(
        [
          exp({ id: 'a', end_day: '2026-11-10' }),
          exp({ id: 'b', end_day: '2026-11-05', status: 'ended' }),
          exp({ id: 'c', end_day: '2026-11-08' }),
        ],
        [],
        '2026-11-06',
      );
      expect(r.active.map((e) => e.id)).toEqual(['c', 'a']);
      expect(r.active[0]).toEqual({
        id: 'c',
        module: 'm1',
        technique: 't1',
        label: 'Label',
        start_day: '2026-11-01',
        end_day: '2026-11-08',
        days_left: 2,
        recent_ratings: [],
      });
    });
  });

  describe('modules_tried', () => {
    it('returns distinct modules across all experiments, including ended ones, sorted', () => {
      const r = introSignalValues(
        [
          exp({ id: 'a', module: 'zeta' }),
          exp({ id: 'b', module: 'alpha', status: 'ended' }),
          exp({ id: 'c', module: 'zeta' }),
          exp({ id: 'd', module: 'mid', status: 'ended' }),
        ],
        [],
        '2026-11-03',
      );
      expect(r.modules_tried).toEqual(['alpha', 'mid', 'zeta']);
    });
  });
});
