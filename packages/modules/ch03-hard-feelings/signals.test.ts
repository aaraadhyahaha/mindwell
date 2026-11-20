import { describe, expect, it } from 'vitest';
import type { Signals } from '@mindwell/core';
import {
  type EventRow,
  type SeriesRow,
  type SessionRow,
  ch03SignalValues,
  clock,
  dayWord,
  daysSinceGratitude,
  eventToday,
  eventsToRate,
  rateCardVisible,
  reappraisalCardVisible,
  sessionCardVisible,
  seriesActive,
} from './signals';

const DAY = '2026-11-20';
const NOW = new Date(2026, 10, 20, 12, 0).toISOString();
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekdayOf = (y: number, m: number, d: number) => WEEKDAYS[new Date(y, m - 1, d).getDay()]!;

let seq = 0;
const ev = (over: Partial<EventRow> & { h?: number; min?: number; dayOffset?: number } = {}): EventRow => {
  seq += 1;
  const { h = 14, min = 0, dayOffset = 0, ...rest } = over;
  const base = new Date(2026, 10, 20 + dayOffset, h, min);
  return {
    id: `e${seq}`,
    title: `Event ${seq}`,
    starts_at: base.toISOString(),
    day: dayOffset === 0 ? DAY : dayOf(base),
    reframe_helped: null,
    outcome_rating: null,
    ...rest,
  };
};
function dayOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const series = (over: Partial<SeriesRow> = {}): SeriesRow => ({
  id: 's1',
  topic: 'money',
  planned_days: 3,
  start_day: '2026-11-18',
  status: 'active',
  ...over,
});
const session = (over: Partial<SessionRow> = {}): SessionRow => ({
  series_id: 's1',
  day: '2026-11-18',
  mood_before: 2,
  mood_after: 4,
  ...over,
});

const values = (over: {
  events?: EventRow[];
  series?: SeriesRow[];
  sessions?: SessionRow[];
  gratitude?: string[];
  day?: string;
  now?: string;
} = {}) =>
  ch03SignalValues(over.events ?? [], over.series ?? [], over.sessions ?? [], over.gratitude ?? [], over.day ?? DAY, over.now ?? NOW);

describe('ch03SignalValues: event_today and events_to_rate', () => {
  it('event_today is the next of today’s events that has not started yet, earliest first', () => {
    const past = ev({ h: 9, title: 'Past' });
    const next = ev({ h: 14, title: 'Next' });
    const later = ev({ h: 16, title: 'Later' });
    const v = values({ events: [later, past, next] });
    expect(v.event_today).toEqual({ id: next.id, title: 'Next', starts_at: next.starts_at });
  });

  it('event_today ignores events on other days', () => {
    const tomorrow = ev({ dayOffset: 1, h: 10, title: 'Tomorrow' });
    expect(values({ events: [tomorrow] }).event_today).toBeNull();
  });

  it('event_today is null when every event today has started', () => {
    expect(values({ events: [ev({ h: 9 }), ev({ h: 11 })] }).event_today).toBeNull();
  });

  it('an event starting exactly now has started: not event_today, but to rate', () => {
    const atNow = ev({ h: 12, min: 0, title: 'Now' });
    const v = values({ events: [atNow] });
    expect(v.event_today).toBeNull();
    expect(v.events_to_rate.map((e) => e.title)).toEqual(['Now']);
  });

  it('events_to_rate: started today with no outcome yet', () => {
    const started = ev({ h: 9, title: 'Started' });
    const rated = ev({ h: 10, title: 'Rated', outcome_rating: 4 });
    const upcoming = ev({ h: 15, title: 'Upcoming' });
    const yesterday = ev({ dayOffset: -1, h: 9, title: 'Yesterday' });
    const v = values({ events: [started, rated, upcoming, yesterday] });
    expect(v.events_to_rate).toEqual([{ id: started.id, title: 'Started', starts_at: started.starts_at }]);
  });

  it('empty events give null and []', () => {
    const v = values();
    expect(v.event_today).toBeNull();
    expect(v.events_to_rate).toEqual([]);
    expect(v.upcoming_events).toEqual([]);
  });
});

describe('ch03SignalValues: series_active', () => {
  it('is null with no active series (a finished one does not count)', () => {
    expect(values({ series: [series({ status: 'finished' })] }).series_active).toBeNull();
  });

  it('day_n is 1 with no finished sessions, and today is not done', () => {
    expect(values({ series: [series()] }).series_active).toEqual({ id: 's1', topic: 'money', day_n: 1, planned: 3, done_today: false });
  });

  it('an unfinished session (mood_after null) does not count', () => {
    const v = values({ series: [series()], sessions: [session({ mood_after: null })] });
    expect(v.series_active?.day_n).toBe(1);
  });

  it('a skipped calendar day does not advance: day_n is finished count + 1', () => {
    const v = values({ series: [series()], sessions: [session({ day: '2026-11-17' })] });
    expect(v.series_active?.day_n).toBe(2);
  });

  it('day_n is capped at planned_days', () => {
    const sessions = [1, 2, 3, 4].map((i) => session({ day: `2026-11-1${i}` }));
    expect(values({ series: [series({ planned_days: 3 })], sessions }).series_active?.day_n).toBe(3);
  });

  it('done_today is true only when a finished session is on today’s day', () => {
    expect(values({ series: [series()], sessions: [session({ day: DAY })] }).series_active?.done_today).toBe(true);
    expect(
      values({ series: [series()], sessions: [session({ day: DAY, mood_after: null })] }).series_active?.done_today,
    ).toBe(false);
  });

  it('sessions of another series are ignored', () => {
    const v = values({ series: [series()], sessions: [session({ series_id: 'other' })] });
    expect(v.series_active?.day_n).toBe(1);
  });
});

describe('ch03SignalValues: days_since_gratitude', () => {
  it('is Infinity when never done', () => {
    expect(values().days_since_gratitude).toBe(Infinity);
  });

  it('is 0 when done today', () => {
    expect(values({ gratitude: [DAY] }).days_since_gratitude).toBe(0);
  });

  it('counts whole days back to the last done day', () => {
    expect(values({ gratitude: ['2026-11-17', '2026-11-15'] }).days_since_gratitude).toBe(3);
  });

  it('ignores future done days (rows after the picked day)', () => {
    expect(values({ gratitude: ['2026-11-15', '2026-11-22'] }).days_since_gratitude).toBe(5);
    expect(values({ gratitude: ['2026-11-22'] }).days_since_gratitude).toBe(Infinity);
  });

  it('crosses a month boundary', () => {
    expect(values({ day: '2026-12-02', gratitude: ['2026-11-28'] }).days_since_gratitude).toBe(4);
  });
});

describe('ch03SignalValues: reframe_helped_rate', () => {
  it('is null with no rated events', () => {
    const v = values({ events: [ev(), ev({ reframe_helped: null })] });
    expect(v.reframe_helped_rate).toBeNull();
    expect(v.reframe_counts).toEqual({ helped: 0, rated: 0 });
  });

  it('counts yes and a_bit as helped over rated events; "no" and unrated are not helped', () => {
    const v = values({
      events: [
        ev({ reframe_helped: 'yes' }),
        ev({ reframe_helped: 'a_bit' }),
        ev({ reframe_helped: 'no' }),
        ev({ reframe_helped: null }),
      ],
    });
    expect(v.reframe_counts).toEqual({ helped: 2, rated: 3 });
    expect(v.reframe_helped_rate).toBeCloseTo(2 / 3, 10);
  });

  it('is 0 (not null) when rated but none helped', () => {
    const v = values({ events: [ev({ reframe_helped: 'no' })] });
    expect(v.reframe_helped_rate).toBe(0);
  });
});

describe('ch03SignalValues: series_moods', () => {
  it('only finished series with at least one finished session get an entry', () => {
    const v = values({
      series: [
        series({ id: 'fin', status: 'finished' }),
        series({ id: 'empty', status: 'finished' }),
        series({ id: 'act', status: 'active' }),
      ],
      sessions: [
        session({ series_id: 'fin', day: '2026-11-18' }),
        session({ series_id: 'act', day: '2026-11-18' }),
      ],
    });
    expect(v.series_moods.map((m) => m.id)).toEqual(['fin']);
  });

  it('averages before and after to 2 decimals, with last_day and n', () => {
    const v = values({
      series: [series({ id: 'fin', status: 'finished' })],
      sessions: [
        session({ series_id: 'fin', day: '2026-11-16', mood_before: 2, mood_after: 4 }),
        session({ series_id: 'fin', day: '2026-11-17', mood_before: 3, mood_after: 4 }),
        session({ series_id: 'fin', day: '2026-11-18', mood_before: 3, mood_after: 5 }),
      ],
    });
    expect(v.series_moods).toEqual([
      { id: 'fin', topic: 'money', last_day: '2026-11-18', n: 3, avg_before: 2.67, avg_after: 4.33 },
    ]);
  });

  it('an unfinished session inside a finished series is not paired', () => {
    const v = values({
      series: [series({ id: 'fin', status: 'finished' })],
      sessions: [
        session({ series_id: 'fin', day: '2026-11-16', mood_before: 2, mood_after: 4 }),
        session({ series_id: 'fin', day: '2026-11-18', mood_before: 5, mood_after: null }),
      ],
    });
    expect(v.series_moods[0]).toMatchObject({ n: 1, last_day: '2026-11-16', avg_before: 2, avg_after: 4 });
  });

  it('sorts newest last session first', () => {
    const v = values({
      series: [series({ id: 'old', status: 'finished' }), series({ id: 'new', status: 'finished' })],
      sessions: [
        session({ series_id: 'old', day: '2026-11-05' }),
        session({ series_id: 'new', day: '2026-11-19' }),
      ],
    });
    expect(v.series_moods.map((m) => m.id)).toEqual(['new', 'old']);
  });
});

describe('ch03SignalValues: upcoming_events', () => {
  it('lists future events in the next 7 days as "Title, day word at HH:MM"', () => {
    const tomorrow = ev({ dayOffset: 1, h: 14, title: 'Viva' });
    const v = values({ events: [tomorrow] });
    expect(v.upcoming_events).toEqual(['Viva, tomorrow at 14:00']);
  });

  it('uses "today" for a later event today, and a weekday for days further out', () => {
    const today = ev({ h: 15, min: 30, title: 'Talk' });
    const further = ev({ dayOffset: 3, h: 9, title: 'Exam' });
    const v = values({ events: [further, today] });
    expect(v.upcoming_events).toEqual([`Talk, today at 15:30`, `Exam, ${weekdayOf(2026, 11, 23)} at 09:00`]);
  });

  it('includes an event exactly 7 days ahead and excludes 8 days ahead', () => {
    const seven = ev({ dayOffset: 7, h: 10, title: 'Seven' });
    const eight = ev({ dayOffset: 8, h: 10, title: 'Eight' });
    const v = values({ events: [seven, eight] });
    expect(v.upcoming_events).toHaveLength(1);
    expect(v.upcoming_events[0]).toMatch(/^Seven, /);
  });

  it('excludes events that have started (including earlier today and starting exactly now)', () => {
    const earlier = ev({ h: 9, title: 'Earlier' });
    const atNow = ev({ h: 12, min: 0, title: 'AtNow' });
    const v = values({ events: [earlier, atNow] });
    expect(v.upcoming_events).toEqual([]);
  });

  it('is empty for a past day only', () => {
    const past = ev({ dayOffset: -2, h: 10, title: 'Past' });
    expect(values({ events: [past] }).upcoming_events).toEqual([]);
  });
});

describe('clock and dayWord', () => {
  it('clock is HH:MM local with zero padding', () => {
    expect(clock(new Date(2026, 10, 20, 9, 5).toISOString())).toBe('09:05');
  });

  it('dayWord: Today, Tomorrow, then the weekday', () => {
    expect(dayWord(DAY, DAY)).toBe('Today');
    expect(dayWord('2026-11-21', DAY)).toBe('Tomorrow');
    expect(dayWord('2026-11-22', DAY)).toBe(weekdayOf(2026, 11, 22));
  });

  it('dayWord rolls over the year end', () => {
    expect(dayWord('2027-01-01', '2026-12-31')).toBe('Tomorrow');
  });
});

describe('Today card visibility helpers', () => {
  const evt = { id: 'e1', title: 'Viva', starts_at: '2026-11-20T14:00:00.000Z' };

  it('reappraisal card shows only when there is an event_today object', () => {
    expect(reappraisalCardVisible({ 'ch03.event_today': evt })).toBe(true);
    expect(reappraisalCardVisible({ 'ch03.event_today': null })).toBe(false);
    expect(reappraisalCardVisible({})).toBe(false);
  });

  it('rate card shows only when events_to_rate is non-empty', () => {
    expect(rateCardVisible({ 'ch03.events_to_rate': [evt] })).toBe(true);
    expect(rateCardVisible({ 'ch03.events_to_rate': [] })).toBe(false);
    expect(rateCardVisible({})).toBe(false);
  });

  it('session card shows for an active series not done today', () => {
    const active = { id: 's1', topic: 'money', day_n: 1, planned: 3, done_today: false };
    expect(sessionCardVisible({ 'ch03.series_active': active })).toBe(true);
    expect(sessionCardVisible({ 'ch03.series_active': { ...active, done_today: true } })).toBe(false);
    expect(sessionCardVisible({ 'ch03.series_active': null })).toBe(false);
    expect(sessionCardVisible({})).toBe(false);
  });

  it('readers return null/[] for missing or wrong-shaped values', () => {
    const s: Signals = { 'ch03.event_today': 'oops', 'ch03.events_to_rate': 'oops', 'ch03.series_active': [] };
    expect(eventToday(s)).toBeNull();
    expect(eventsToRate(s)).toEqual([]);
    expect(seriesActive(s)).toBeNull();
  });

  it('daysSinceGratitude: number when finite, Infinity when missing or Infinity', () => {
    expect(daysSinceGratitude({ 'ch03.days_since_gratitude': 3 })).toBe(3);
    expect(daysSinceGratitude({ 'ch03.days_since_gratitude': Infinity })).toBe(Infinity);
    expect(daysSinceGratitude({})).toBe(Infinity);
    expect(daysSinceGratitude({ 'ch03.days_since_gratitude': null })).toBe(Infinity);
  });
});
