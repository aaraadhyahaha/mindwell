import { describe, expect, it } from 'vitest';
import type { Session } from './schema';
import { elapsedMinutes, formatClock, nextDay, remainingMs, seriesStep } from './writing';

const T0 = Date.parse('2026-03-02T10:00:00.000Z');
const iso = new Date(T0).toISOString();
const sess = (day: string, after: number | null): Session =>
  ({ id: day, day, mood_before: 2, mood_after: after, minutes: 15, series_id: 's' }) as unknown as Session;

describe('writing helpers', () => {
  it('remainingMs counts down and clamps', () => {
    expect(remainingMs(iso, T0)).toBe(900_000);
    expect(remainingMs(iso, T0 + 60_000)).toBe(840_000);
    expect(remainingMs(iso, T0 + 2_000_000)).toBe(0);
    expect(remainingMs(iso, T0 - 5000)).toBe(900_000);
  });
  it('elapsedMinutes is 1..15', () => {
    expect(elapsedMinutes(iso, T0 + 10_000)).toBe(1);
    expect(elapsedMinutes(iso, T0 + 7.5 * 60_000)).toBe(7);
    expect(elapsedMinutes(iso, T0 + 3_600_000)).toBe(15);
  });
  it('formatClock', () => {
    expect(formatClock(900_000)).toBe('15:00');
    expect(formatClock(61_000)).toBe('01:01');
    expect(formatClock(500)).toBe('00:01');
    expect(formatClock(-5)).toBe('00:00');
  });
  it('nextDay counts finished sessions, capped', () => {
    expect(nextDay([], 3)).toBe(1);
    expect(nextDay([sess('a', 3), sess('b', null)], 3)).toBe(2);
    expect(nextDay([sess('a', 3), sess('b', 3), sess('c', 4)], 3)).toBe(3);
  });
  it('seriesStep', () => {
    expect(seriesStep([], 'd')).toBe('mood_before');
    expect(seriesStep([sess('d', null)], 'd')).toBe('timer');
    expect(seriesStep([sess('d', 4)], 'd')).toBe('done_today');
    expect(seriesStep([sess('c', 4)], 'd')).toBe('mood_before');
  });
});
