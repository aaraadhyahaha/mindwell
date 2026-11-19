import { afterEach, describe, expect, it, vi } from 'vitest';

// Pin the time zone so results do not depend on the machine. Dates are built
// with local-time constructors below, so they stay consistent with this zone.
// Setting process.env.TZ at runtime is honoured by Node. dates.ts does no
// Date work at module load, so the order of imports does not matter.
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/Berlin';

import { addDays, daysBetween, DAY_BOUNDARY_HOUR, isDay, localDay } from './dates';

/** A local Date from wall-clock parts (month is 1-based). */
function at(y: number, mo: number, d: number, h = 12, mi = 0): Date {
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('DAY_BOUNDARY_HOUR', () => {
  it('is 4', () => {
    expect(DAY_BOUNDARY_HOUR).toBe(4);
  });
});

describe('localDay', () => {
  it('uses the same calendar day for a midday time', () => {
    expect(localDay(at(2026, 5, 10, 12, 0))).toBe('2026-05-10');
  });

  it('places 03:59 in the previous day', () => {
    expect(localDay(at(2026, 5, 10, 3, 59))).toBe('2026-05-09');
  });

  it('places 04:00 in the new day (boundary is inclusive)', () => {
    expect(localDay(at(2026, 5, 10, 4, 0))).toBe('2026-05-10');
  });

  it('places 04:01 in the new day', () => {
    expect(localDay(at(2026, 5, 10, 4, 1))).toBe('2026-05-10');
  });

  it('places midnight in the previous day', () => {
    expect(localDay(at(2026, 5, 10, 0, 0))).toBe('2026-05-09');
  });

  it('places a 01:00 evening close in the previous day', () => {
    expect(localDay(at(2026, 5, 10, 1, 0))).toBe('2026-05-09');
  });

  it('rolls back across a month boundary (03:59 on the 1st)', () => {
    expect(localDay(at(2026, 3, 1, 3, 59))).toBe('2026-02-28');
  });

  it('rolls back across a year boundary (03:59 on Jan 1)', () => {
    expect(localDay(at(2027, 1, 1, 3, 59))).toBe('2026-12-31');
  });

  it('keeps Jan 1 at 04:00 in the new year', () => {
    expect(localDay(at(2027, 1, 1, 4, 0))).toBe('2027-01-01');
  });

  it('returns Feb 29 for a late-night close on Mar 1 of a leap year', () => {
    expect(localDay(at(2028, 3, 1, 3, 30))).toBe('2028-02-29');
  });

  it('returns Mar 1 at 04:00 of a leap year', () => {
    expect(localDay(at(2028, 3, 1, 4, 0))).toBe('2028-03-01');
  });

  it('returns Feb 28 for 01:00 on Mar 1 of a non-leap century year (2100)', () => {
    expect(localDay(at(2100, 3, 1, 1, 0))).toBe('2100-02-28');
  });

  it('is correct on the DST start night (no 02:xx local time)', () => {
    // Europe/Berlin springs forward 2026-03-29 02:00 -> 03:00.
    expect(localDay(at(2026, 3, 29, 3, 30))).toBe('2026-03-28');
    expect(localDay(at(2026, 3, 29, 4, 0))).toBe('2026-03-29');
  });

  it('is correct on the DST end day (repeated 02:xx local time)', () => {
    // Europe/Berlin falls back 2026-10-25 03:00 -> 02:00.
    expect(localDay(at(2026, 10, 25, 4, 0))).toBe('2026-10-25');
    expect(localDay(at(2026, 10, 25, 3, 59))).toBe('2026-10-24');
  });

  it('defaults to now when called with no argument', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at(2026, 7, 4, 4, 0));
    expect(localDay()).toBe('2026-07-04');
    vi.setSystemTime(at(2026, 7, 4, 3, 0));
    expect(localDay()).toBe('2026-07-03');
  });

  it('throws on an invalid Date', () => {
    expect(() => localDay(new Date('not a date'))).toThrow(RangeError);
  });
});

describe('isDay', () => {
  it('accepts real calendar dates', () => {
    expect(isDay('2026-05-10')).toBe(true);
    expect(isDay('2028-02-29')).toBe(true);
    expect(isDay('2000-02-29')).toBe(true);
  });

  it('rejects impossible dates', () => {
    expect(isDay('2026-02-29')).toBe(false);
    expect(isDay('2027-02-29')).toBe(false);
    expect(isDay('2100-02-29')).toBe(false);
    expect(isDay('2026-04-31')).toBe(false);
    expect(isDay('2026-13-01')).toBe(false);
    expect(isDay('2026-00-10')).toBe(false);
    expect(isDay('2026-05-00')).toBe(false);
  });

  it('rejects other formats', () => {
    expect(isDay('')).toBe(false);
    expect(isDay('2026-5-10')).toBe(false);
    expect(isDay('26-05-10')).toBe(false);
    expect(isDay('2026/05/10')).toBe(false);
    expect(isDay('2026-05-10T04:00')).toBe(false);
    expect(isDay(' 2026-05-10')).toBe(false);
  });
});

describe('addDays', () => {
  it('adds within a month', () => {
    expect(addDays('2026-05-10', 1)).toBe('2026-05-11');
  });

  it('is the identity for 0', () => {
    expect(addDays('2026-05-10', 0)).toBe('2026-05-10');
  });

  it('rolls over a month end', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01');
  });

  it('rolls over a year end', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles a leap day in 2028', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-28', 2)).toBe('2028-03-01');
  });

  it('skips Feb 29 in a non-leap year', () => {
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('does not treat 2100 as a leap year', () => {
    expect(addDays('2100-02-28', 1)).toBe('2100-03-01');
  });

  it('treats 2000 as a leap year', () => {
    expect(addDays('2000-02-28', 1)).toBe('2000-02-29');
  });

  it('subtracts with negative n across months and years', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('adds many days', () => {
    expect(addDays('2026-01-01', 365)).toBe('2027-01-01');
  });

  it('throws on a non-integer n', () => {
    expect(() => addDays('2026-05-10', 1.5)).toThrow(RangeError);
    expect(() => addDays('2026-05-10', Number.NaN)).toThrow(RangeError);
  });

  it('throws on an invalid day', () => {
    expect(() => addDays('2026-02-29', 1)).toThrow(RangeError);
    expect(() => addDays('bogus', 1)).toThrow(RangeError);
  });
});

describe('daysBetween', () => {
  it('is 0 for the same day', () => {
    expect(daysBetween('2026-05-10', '2026-05-10')).toBe(0);
  });

  it('is positive when to is later', () => {
    expect(daysBetween('2026-05-10', '2026-05-12')).toBe(2);
  });

  it('is negative when to is earlier', () => {
    expect(daysBetween('2026-05-12', '2026-05-10')).toBe(-2);
  });

  it('counts across a month end', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
  });

  it('counts across a year end', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('counts a leap year correctly', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1);
  });

  it('is the inverse of addDays', () => {
    expect(daysBetween('2026-05-10', addDays('2026-05-10', 400))).toBe(400);
  });

  it('throws on an invalid day', () => {
    expect(() => daysBetween('2026-02-30', '2026-03-01')).toThrow(RangeError);
    expect(() => daysBetween('2026-03-01', 'nope')).toThrow(RangeError);
  });
});
