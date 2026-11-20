import { describe, expect, it } from 'vitest';
import type { ModuleReminder } from '@mindwell/core';
import { pickReminder } from '@mindwell/core';
import { REAPPRAISAL_BODY, eventReminders, type ReminderEvent } from './reminders';

// Local-time constructors so the tests hold in any timezone.
const local = (y: number, m: number, d: number, h: number, min: number) => new Date(y, m - 1, d, h, min).toISOString();

const DAY = '2026-11-20';
const MORNING = '09:00';
const NOON = local(2026, 11, 20, 8, 0);

const event = (over: Partial<ReminderEvent> = {}): ReminderEvent => ({
  id: 'e1',
  title: 'Viva',
  starts_at: local(2026, 11, 20, 14, 0),
  day: DAY,
  updated_at: local(2026, 11, 19, 20, 0),
  ...over,
});

const byKeySuffix = (rs: ModuleReminder[], suffix: string) => rs.find((r) => r.key.endsWith(suffix));

describe('eventReminders: morning-of and 60-min-before', () => {
  it('emits a morning-of reminder at the morning time and a 60-min-before one, both ending at the start', () => {
    const e = event();
    const rs = eventReminders([e], NOON, MORNING);
    expect(rs).toHaveLength(2);

    const morning = byKeySuffix(rs, ':morning')!;
    expect(morning.key).toBe(`ch03.event:e1:${e.starts_at}:morning`);
    expect(morning.at).toBe(local(2026, 11, 20, 9, 0));
    expect(morning.until).toBe(e.starts_at);
    expect(morning.title).toBe('Today: Viva at 14:00');
    expect(morning.body).toBe(REAPPRAISAL_BODY);

    const pre = byKeySuffix(rs, ':pre')!;
    expect(pre.key).toBe(`ch03.event:e1:${e.starts_at}:pre`);
    expect(pre.at).toBe(local(2026, 11, 20, 13, 0));
    expect(pre.until).toBe(e.starts_at);
    expect(pre.title).toBe('Viva in an hour');
    expect(pre.body).toBe(REAPPRAISAL_BODY);
  });

  it('uses the morning HH:MM on the event day, not on now’s day', () => {
    const rs = eventReminders([event({ day: '2026-11-21', starts_at: local(2026, 11, 21, 15, 0) })], NOON, '07:45');
    const morning = byKeySuffix(rs, ':morning')!;
    expect(morning.at).toBe(local(2026, 11, 21, 7, 45));
  });

  it('returns nothing for an empty event list', () => {
    expect(eventReminders([], NOON, MORNING)).toEqual([]);
  });
});

describe('eventReminders: past and starting-now events', () => {
  it('emits nothing for an event that already started', () => {
    const e = event({ starts_at: local(2026, 11, 20, 7, 0), updated_at: local(2026, 11, 19, 20, 0) });
    expect(eventReminders([e], NOON, MORNING)).toEqual([]);
  });

  it('emits nothing for an event starting exactly now', () => {
    const e = event({ starts_at: NOON, updated_at: local(2026, 11, 19, 20, 0) });
    expect(eventReminders([e], NOON, MORNING)).toEqual([]);
  });
});

describe('eventReminders: morning-of skipped when not before the 60-min mark', () => {
  it('event 08:00 with morning 07:30: morning skipped, 60-min one (07:00) kept', () => {
    const e = event({ starts_at: local(2026, 11, 20, 8, 0) });
    const rs = eventReminders([e], local(2026, 11, 20, 6, 0), '07:30');
    expect(rs.map((r) => r.key)).toEqual([`ch03.event:e1:${e.starts_at}:pre`]);
    expect(rs[0]!.at).toBe(local(2026, 11, 20, 7, 0));
  });

  it('morning exactly equal to the 60-min mark is skipped (strictly before only)', () => {
    const e = event({ starts_at: local(2026, 11, 20, 10, 0) });
    const rs = eventReminders([e], local(2026, 11, 20, 6, 0), '09:00');
    expect(rs.map((r) => r.key)).toEqual([`ch03.event:e1:${e.starts_at}:pre`]);
  });

  it('a malformed morning time yields only the 60-min reminder', () => {
    const rs = eventReminders([event()], NOON, '9am');
    expect(rs).toHaveLength(1);
    expect(rs[0]!.key.endsWith(':pre')).toBe(true);
  });
});

describe('eventReminders: edits and already-passed times', () => {
  it('adding an event 30 min ahead gives no reminders at all', () => {
    const now = local(2026, 11, 20, 13, 30);
    const e = event({ starts_at: local(2026, 11, 20, 14, 0), updated_at: now });
    expect(eventReminders([e], now, MORNING)).toEqual([]);
  });

  it('a reminder whose time is exactly the edit time is kept (not yet past)', () => {
    const now = local(2026, 11, 20, 12, 0);
    const pre = local(2026, 11, 20, 13, 0);
    const e = event({ starts_at: local(2026, 11, 20, 14, 0), updated_at: pre });
    const rs = eventReminders([e], now, MORNING);
    expect(rs.map((r) => r.key)).toEqual([`ch03.event:e1:${e.starts_at}:pre`]);
  });

  it('edited after the morning time but before the 60-min mark: morning dropped, 60-min kept', () => {
    // Edited at 10:00 for a 14:00 event: morning (09:00) already past at edit, 60-min (13:00) still ahead.
    const now = local(2026, 11, 20, 10, 0);
    const e = event({ starts_at: local(2026, 11, 20, 14, 0), updated_at: now });
    const rs = eventReminders([e], now, MORNING);
    expect(rs.map((r) => r.key)).toEqual([`ch03.event:e1:${e.starts_at}:pre`]);
  });
});

describe('eventReminders: rescheduling', () => {
  it('a new starts_at changes the keys (old keys are gone)', () => {
    const before = eventReminders([event({ starts_at: local(2026, 11, 20, 14, 0) })], NOON, MORNING);
    const after = eventReminders([event({ starts_at: local(2026, 11, 20, 15, 0), updated_at: NOON })], NOON, MORNING);
    const beforeKeys = before.map((r) => r.key);
    const afterKeys = after.map((r) => r.key);
    expect(afterKeys.length).toBeGreaterThan(0);
    for (const k of afterKeys) expect(beforeKeys).not.toContain(k);
    for (const k of afterKeys) expect(k).toContain(local(2026, 11, 20, 15, 0));
  });

  it('the same event and start keep the same keys across calls', () => {
    const a = eventReminders([event()], NOON, MORNING).map((r) => r.key);
    const b = eventReminders([event()], local(2026, 11, 20, 9, 30), MORNING).map((r) => r.key);
    expect(a).toEqual(b);
  });
});

describe('catch-up on focus (eventReminders fed into pickReminder)', () => {
  // Event at 14:00 with a 09:00 morning and 13:00 pre; the tab was closed until 13:30.
  const e = event({ starts_at: local(2026, 11, 20, 14, 0), updated_at: local(2026, 11, 19, 20, 0) });
  const FOCUS = local(2026, 11, 20, 13, 30);

  it('shows exactly one reminder (the 60-min one) and marks both sent', () => {
    const rs = eventReminders([e], FOCUS, MORNING);
    expect(rs).toHaveLength(2);

    const pick = pickReminder(FOCUS, rs, new Set());
    expect(pick.show?.key).toBe(`ch03.event:e1:${e.starts_at}:pre`);
    expect(pick.markSent.sort()).toEqual(rs.map((r) => r.key).sort());
  });

  it('after the marks are stored, the next focus shows nothing', () => {
    const rs = eventReminders([e], FOCUS, MORNING);
    const first = pickReminder(FOCUS, rs, new Set());
    const later = pickReminder(local(2026, 11, 20, 13, 45), rs, new Set(first.markSent));
    expect(later.show).toBeNull();
    expect(later.markSent).toEqual([]);
  });

  it('after the event has started, nothing is shown', () => {
    const started = local(2026, 11, 20, 14, 30);
    const rs = eventReminders([e], started, MORNING);
    expect(rs).toEqual([]);
    expect(pickReminder(started, rs, new Set()).show).toBeNull();
  });
});
