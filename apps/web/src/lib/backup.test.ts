import { describe, expect, it } from 'vitest';
import { BACKUP_INTERVAL_DAYS, backupDue } from './backup';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-19T12:00:00.000Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const none = { since: null, lastExportAt: null, dismissedAt: null };

describe('backupDue', () => {
  it('interval is 7 days', () => {
    expect(BACKUP_INTERVAL_DAYS).toBe(7);
  });

  it('is false when every timestamp is null', () => {
    expect(backupDue(now, none)).toBe(false);
  });

  it('is due exactly at 7 days', () => {
    expect(backupDue(now, { ...none, since: ago(7 * DAY_MS) })).toBe(true);
  });

  it('is not due at 7 days minus 1 ms', () => {
    expect(backupDue(now, { ...none, since: ago(7 * DAY_MS - 1) })).toBe(false);
  });

  it('uses the latest export when since is old', () => {
    expect(
      backupDue(now, { since: ago(30 * DAY_MS), lastExportAt: ago(DAY_MS), dismissedAt: null })
    ).toBe(false);
  });

  it('uses the latest dismissal when the export is old', () => {
    expect(
      backupDue(now, { since: null, lastExportAt: ago(30 * DAY_MS), dismissedAt: ago(DAY_MS) })
    ).toBe(false);
  });

  it('is due when the newest of the three is at least 7 days old', () => {
    expect(
      backupDue(now, {
        since: ago(30 * DAY_MS),
        lastExportAt: ago(10 * DAY_MS),
        dismissedAt: ago(8 * DAY_MS),
      })
    ).toBe(true);
  });

  it('ignores unparseable strings and uses the valid ones', () => {
    expect(
      backupDue(now, { since: 'not a date', lastExportAt: ago(DAY_MS), dismissedAt: '' })
    ).toBe(false);
    expect(
      backupDue(now, { since: 'garbage', lastExportAt: ago(8 * DAY_MS), dismissedAt: null })
    ).toBe(true);
  });

  it('is false when only unparseable strings are present', () => {
    expect(
      backupDue(now, { since: 'nope', lastExportAt: 'also nope', dismissedAt: 'x' })
    ).toBe(false);
  });
});
