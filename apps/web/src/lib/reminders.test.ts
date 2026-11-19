import { describe, expect, it } from 'vitest';
import { dueReminders } from './reminders';
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
