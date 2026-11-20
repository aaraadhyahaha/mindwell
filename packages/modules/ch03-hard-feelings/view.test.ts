import { describe, expect, it } from 'vitest';
import { dayLabel, fromStartsAt, splitEvents, tabFromSearch, toStartsAt } from './view';

describe('view helpers', () => {
  it('labels days in words', () => {
    expect(dayLabel('2026-11-20', '2026-11-20')).toBe('Today');
    expect(dayLabel('2026-11-19', '2026-11-20')).toBe('Yesterday');
    expect(dayLabel('2026-11-21', '2026-11-20')).toBe('Tomorrow');
    expect(dayLabel('2026-11-26', '2026-11-20')).toBe('Thursday, 26 November');
  });
  it('reads the tab from the query, defaulting to defuse', () => {
    expect(tabFromSearch('?tab=events')).toBe('events');
    expect(tabFromSearch('?tab=nope')).toBe('defuse');
    expect(tabFromSearch('')).toBe('defuse');
  });
  it('round-trips local date and time', () => {
    const iso = toStartsAt('2026-11-21', '14:05')!;
    expect(iso).toBe(new Date(2026, 10, 21, 14, 5).toISOString());
    expect(fromStartsAt(iso)).toEqual({ date: '2026-11-21', time: '14:05' });
    expect(toStartsAt('2026-11-21', '')).toBeNull();
    expect(toStartsAt('', '10:00')).toBeNull();
  });
  it('splits upcoming (soonest first) from past (newest first)', () => {
    const at = (h: number) => ({ id: String(h), starts_at: new Date(2026, 10, 20, h).toISOString() });
    const now = new Date(2026, 10, 20, 12).toISOString();
    const { upcoming, past } = splitEvents([at(15), at(9), at(13), at(12), at(8)], now);
    expect(upcoming.map((e) => e.id)).toEqual(['13', '15']);
    expect(past.map((e) => e.id)).toEqual(['12', '9', '8']);
  });
});
