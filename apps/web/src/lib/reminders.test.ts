import { describe, expect, it } from 'vitest';
import { catchUpReminder, dueReminders } from './reminders';
import type { ReminderConfig, ReminderSent } from './reminders';

const cfg: ReminderConfig = { morning: '07:30', morningOn: true, evening: '21:30', eveningOn: true };
const none: ReminderSent = { morning: null, evening: null };
const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m);

describe('dueReminders', () => {
  it('fires exactly at the time', () => {
    expect(dueReminders(at(10, 7, 30), cfg, null, none)).toEqual(['morning']);
    expect(dueReminders(at(10, 21, 30), cfg, null, none)).toEqual(['evening']);
  });
  it('not before the time', () => {
    expect(dueReminders(at(10, 7, 29), cfg, null, none)).toEqual([]);
  });
  it('fires at +59 but not at +60 minutes', () => {
    expect(dueReminders(at(10, 8, 29), cfg, null, none)).toEqual(['morning']);
    expect(dueReminders(at(10, 8, 30), cfg, null, none)).toEqual([]);
  });
  it('crosses midnight', () => {
    const late = { ...cfg, evening: '23:45' };
    expect(dueReminders(at(11, 0, 15), late, null, { morning: null, evening: null })).toEqual(['evening']);
    expect(dueReminders(at(11, 0, 45), late, null, none)).toEqual([]);
  });
  it('treats 03:59 as the previous day', () => {
    const late = { ...cfg, evening: '23:45' };
    expect(dueReminders(at(11, 3, 59), late, null, none)).toEqual([]);
    const sent = { morning: null, evening: '2026-11-10' };
    expect(dueReminders(at(11, 0, 15), late, null, sent)).toEqual([]);
  });
  it('skips when already sent today', () => {
    expect(dueReminders(at(10, 7, 40), cfg, null, { ...none, morning: '2026-11-10' })).toEqual([]);
    expect(dueReminders(at(10, 7, 40), cfg, null, { ...none, morning: '2026-11-09' })).toEqual(['morning']);
  });
  it('skips when the part is done', () => {
    expect(dueReminders(at(10, 7, 40), cfg, { checkin_at: 'x', closed_at: null }, none)).toEqual([]);
    expect(dueReminders(at(10, 21, 40), cfg, { checkin_at: 'x', closed_at: null }, none)).toEqual(['evening']);
    expect(dueReminders(at(10, 21, 40), cfg, { checkin_at: null, closed_at: 'x' }, none)).toEqual([]);
  });
  it('skips when off', () => {
    expect(dueReminders(at(10, 7, 40), { ...cfg, morningOn: false }, null, none)).toEqual([]);
    expect(dueReminders(at(10, 21, 40), { ...cfg, eveningOn: false }, null, none)).toEqual([]);
  });
  it('ignores a malformed time', () => {
    expect(dueReminders(at(10, 7, 40), { ...cfg, morning: '' }, null, none)).toEqual([]);
  });
});

describe('catchUpReminder', () => {
  const open = { checkin_at: null, closed_at: null };
  const checked = { checkin_at: 'x', closed_at: null };
  const closed = { checkin_at: null, closed_at: 'x' };

  it('returns null before the morning time', () => {
    expect(catchUpReminder(at(10, 7, 29), cfg, open, none)).toBeNull();
  });
  it('returns morning exactly at the morning time', () => {
    expect(catchUpReminder(at(10, 7, 30), cfg, open, none)).toBe('morning');
  });
  it('returns morning hours after the time when not checked in', () => {
    expect(catchUpReminder(at(10, 10, 30), cfg, open, none)).toBe('morning');
  });
  it('returns null when morning is checked in', () => {
    expect(catchUpReminder(at(10, 10, 30), cfg, checked, none)).toBeNull();
  });
  it('skips morning already sent today but not sent yesterday', () => {
    expect(catchUpReminder(at(10, 10, 30), cfg, open, { ...none, morning: '2026-11-10' })).toBeNull();
    expect(catchUpReminder(at(10, 10, 30), cfg, open, { ...none, morning: '2026-11-09' })).toBe('morning');
  });
  it('returns evening over morning when both are missed', () => {
    expect(catchUpReminder(at(10, 22, 0), cfg, open, none)).toBe('evening');
  });
  it('falls back to morning when evening is closed but morning is missed', () => {
    expect(catchUpReminder(at(10, 22, 0), cfg, closed, none)).toBe('morning');
  });
  it('returns evening at and after the evening time, not before', () => {
    expect(catchUpReminder(at(10, 21, 29), cfg, checked, none)).toBeNull();
    expect(catchUpReminder(at(10, 21, 30), cfg, checked, none)).toBe('evening');
  });
  it('treats 01:30 after midnight as the same day for a 21:30 evening', () => {
    expect(catchUpReminder(at(11, 1, 30), cfg, checked, none)).toBe('evening');
  });
  it('treats 04:00 as a new day, so yesterday-morning is not missed', () => {
    expect(catchUpReminder(at(11, 4, 0), cfg, open, none)).toBeNull();
  });
  it('ignores a kind that is switched off', () => {
    expect(catchUpReminder(at(10, 10, 30), { ...cfg, morningOn: false }, open, none)).toBeNull();
    expect(catchUpReminder(at(10, 22, 0), { ...cfg, eveningOn: false }, checked, none)).toBeNull();
    expect(catchUpReminder(at(10, 22, 0), { ...cfg, eveningOn: false }, open, none)).toBe('morning');
  });
  it('ignores a malformed time string', () => {
    expect(catchUpReminder(at(10, 10, 30), { ...cfg, morning: '' }, open, none)).toBeNull();
    expect(catchUpReminder(at(10, 22, 0), { ...cfg, evening: '21:3x' }, checked, none)).toBeNull();
    expect(catchUpReminder(at(10, 22, 0), { ...cfg, evening: '21:3x' }, open, none)).toBe('morning');
  });
  it('treats a null day record as not done', () => {
    expect(catchUpReminder(at(10, 9, 0), cfg, null, none)).toBe('morning');
    expect(catchUpReminder(at(10, 22, 0), cfg, null, none)).toBe('evening');
  });
});
