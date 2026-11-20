import { describe, expect, it } from 'vitest';
import { dayLabel, defusedText, gratitudeSummary, gratitudeWeeks, fromStartsAt, sessionLines, splitEvents, tabFromSearch, toStartsAt } from './view';

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
  it('phrases a defused thought', () => {
    expect(defusedText("I'm going to fail this.")).toBe("I'm having the thought that I'm going to fail this.");
    expect(defusedText('I am useless')).toBe("I'm having the thought that I am useless.");
    expect(defusedText('Everyone will notice. ')).toBe("I'm having the thought that everyone will notice.");
  });
  it('groups gratitude days by Monday-start week, last 8 weeks', () => {
    // 2026-11-20 is a Friday; its week starts Monday 16 November.
    const w = gratitudeWeeks(['2026-11-20', '2026-11-16', '2026-11-15', '2026-11-15', '2026-09-01'], '2026-11-20');
    expect(w).toEqual([
      { start: '2026-11-16', label: 'Week of 16 November', count: 2 },
      { start: '2026-11-09', label: 'Week of 9 November', count: 1 },
    ]);
  });
  it('builds session review lines with series number', () => {
    const all = [
      { id: 'a', series_id: 's', day: '2026-11-17' },
      { id: 'b', series_id: 's', day: '2026-11-18' },
      { id: 'c', series_id: 't', day: '2026-11-18' },
    ];
    const week = [
      { ...all[1]!, minutes: 15, mood_before: 2, mood_after: 4 },
      { ...all[2]!, minutes: 10, mood_before: 3, mood_after: null },
    ];
    const lines = sessionLines(week, all, [{ id: 's', topic: 'Exam' }]);
    expect(lines.map((l) => [l.topic, l.day_n, l.mood_after])).toEqual([['Exam', 2, 4], ['Writing', 1, null]]);
  });
  it('summarises gratitude counts plainly', () => {
    expect(gratitudeSummary(0)).toBe('Not this week');
    expect(gratitudeSummary(1)).toBe('Done 1 time this week');
    expect(gratitudeSummary(2)).toBe('Done 2 times this week');
  });
});
