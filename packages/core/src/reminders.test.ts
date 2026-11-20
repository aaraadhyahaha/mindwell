import { describe, expect, it } from 'vitest';
import type { ModuleReminder } from './module';
import { pickReminder, pruneSent } from './reminders';

const r = (key: string, at: string, until: string): ModuleReminder => ({ key, at, until, title: key, body: 'b' });
const NONE: ReadonlySet<string> = new Set();

const AT = '2026-11-20T10:00:00.000Z';
const UNTIL = '2026-11-20T14:00:00.000Z';

describe('pickReminder: due window', () => {
  it('shows nothing before `at`', () => {
    const rem = [r('a', AT, UNTIL)];
    const pick = pickReminder('2026-11-20T09:59:59.999Z', rem, NONE);
    expect(pick.show).toBeNull();
    expect(pick.markSent).toEqual([]);
  });

  it('shows at exactly `at` (inclusive)', () => {
    const pick = pickReminder(AT, [r('a', AT, UNTIL)], NONE);
    expect(pick.show?.key).toBe('a');
    expect(pick.markSent).toEqual(['a']);
  });

  it('shows nothing at exactly `until`, but still shows one millisecond before', () => {
    const rem = [r('a', AT, UNTIL)];
    expect(pickReminder(UNTIL, rem, NONE).show).toBeNull();
    expect(pickReminder('2026-11-20T13:59:59.999Z', rem, NONE).show?.key).toBe('a');
  });

  it('shows nothing after `until`', () => {
    const pick = pickReminder('2026-11-20T15:00:00.000Z', [r('a', AT, UNTIL)], NONE);
    expect(pick.show).toBeNull();
    expect(pick.markSent).toEqual([]);
  });

  it('returns nothing for an empty list', () => {
    expect(pickReminder(AT, [], NONE)).toEqual({ show: null, markSent: [] });
  });
});

describe('pickReminder: sent keys', () => {
  it('a sent key never shows again', () => {
    const pick = pickReminder(AT, [r('a', AT, UNTIL)], new Set(['a']));
    expect(pick.show).toBeNull();
    expect(pick.markSent).toEqual([]);
  });

  it('a sent latest reminder does not hide an older pending one', () => {
    const rem = [r('old', '2026-11-20T10:00:00.000Z', UNTIL), r('new', '2026-11-20T11:00:00.000Z', UNTIL)];
    const pick = pickReminder('2026-11-20T11:30:00.000Z', rem, new Set(['new']));
    expect(pick.show?.key).toBe('old');
    expect(pick.markSent).toEqual(['old']);
  });
});

describe('pickReminder: several pending', () => {
  it('shows only the latest by `at`, and marks every pending key sent (in `at` order)', () => {
    const rem = [
      r('a', '2026-11-20T10:00:00.000Z', UNTIL),
      r('b', '2026-11-20T10:30:00.000Z', UNTIL),
      r('c', '2026-11-20T10:15:00.000Z', UNTIL),
    ];
    const pick = pickReminder('2026-11-20T10:45:00.000Z', rem, NONE);
    expect(pick.show?.key).toBe('b');
    expect(pick.markSent).toEqual(['a', 'c', 'b']);
  });

  it('ties on `at` break by key: the greater key is shown', () => {
    const rem = [r('x', AT, UNTIL), r('y', AT, UNTIL)];
    const pick = pickReminder(AT, rem, NONE);
    expect(pick.show?.key).toBe('y');
    expect(pick.markSent).toEqual(['x', 'y']);
  });

  it('marks only the still-pending keys when some were already sent', () => {
    const rem = [
      r('a', '2026-11-20T10:00:00.000Z', UNTIL),
      r('b', '2026-11-20T10:30:00.000Z', UNTIL),
      r('c', '2026-11-20T10:15:00.000Z', UNTIL),
    ];
    const pick = pickReminder('2026-11-20T10:45:00.000Z', rem, new Set(['b']));
    expect(pick.show?.key).toBe('c');
    expect(pick.markSent).toEqual(['a', 'c']);
  });

  it('ignores reminders not yet due or already ended when marking', () => {
    const rem = [
      r('due', AT, UNTIL),
      r('later', '2026-11-20T12:00:00.000Z', UNTIL),
      r('ended', '2026-11-20T08:00:00.000Z', '2026-11-20T09:00:00.000Z'),
    ];
    const pick = pickReminder('2026-11-20T10:30:00.000Z', rem, NONE);
    expect(pick.show?.key).toBe('due');
    expect(pick.markSent).toEqual(['due']);
  });
});

describe('pruneSent', () => {
  const rem = [r('a', AT, UNTIL), r('c', AT, UNTIL)];

  it('keeps only the sent keys that are still listed, in sent order', () => {
    expect(pruneSent(['c', 'gone', 'a'], rem)).toEqual(['c', 'a']);
  });

  it('returns [] for empty sent', () => {
    expect(pruneSent([], rem)).toEqual([]);
  });

  it('returns [] when no reminders are listed any more', () => {
    expect(pruneSent(['a', 'c'], [])).toEqual([]);
  });

  it('keeps nothing that is no longer listed (a rescheduled key is dropped)', () => {
    expect(pruneSent(['ch03.event:e1:old:pre'], [r('ch03.event:e1:new:pre', AT, UNTIL)])).toEqual([]);
  });
});
