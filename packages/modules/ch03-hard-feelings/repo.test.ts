import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { coreMigrations } from '@mindwell/core';
import type { Store } from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBetterSqliteDriver } from '@mindwell/storage-sqlite/testing';
import { migrations } from './migrations';
import * as repo from './repo';
import { SERIES_PROMPTS, SESSION_MINUTES } from './schema';

let driver: ReturnType<typeof createBetterSqliteDriver>;
let store: Store;

beforeEach(async () => {
  driver = createBetterSqliteDriver();
  store = createStore(driver);
  await store.migrate('core', coreMigrations);
  await store.migrate('ch03', migrations);
});
afterEach(() => driver.close());

describe('ch03 schema', () => {
  it('exports prompts and session length', () => {
    expect(SERIES_PROMPTS).toHaveLength(4);
    expect(SESSION_MINUTES).toBe(15);
  });

  it('has no free-text columns on sessions or gratitude', async () => {
    const cols = async (t: string) =>
      (await driver.select<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name).sort();
    expect(await cols('ch03_gratitude')).toEqual(
      ['created_at', 'day', 'deleted_at', 'id', 'schema_version', 'updated_at'],
    );
    expect(await cols('ch03_sessions')).toEqual(
      ['created_at', 'day', 'deleted_at', 'id', 'minutes', 'mood_after', 'mood_before', 'schema_version', 'series_id', 'updated_at'],
    );
  });
});

describe('defusions', () => {
  it('adds, lists newest first with limit, and filters by day', async () => {
    await repo.addDefusion(store, { thought_text: ' I am behind ', day: '2026-11-09', capture_id: 'c1' });
    await repo.addDefusion(store, { thought_text: 'I will fail', day: '2026-11-12' });
    const all = await repo.listDefusions(store);
    expect(all.map((d) => d.thought_text)).toEqual(['I will fail', 'I am behind']);
    expect(all[1]?.capture_id).toBe('c1');
    expect(all[0]?.capture_id).toBeNull();
    expect(await repo.listDefusions(store, 1)).toHaveLength(1);
    expect((await repo.defusionsBetween(store, '2026-11-10', '2026-11-15')).map((d) => d.day)).toEqual(['2026-11-12']);
  });

  it('rejects bad text and day', async () => {
    await expect(repo.addDefusion(store, { thought_text: '   ', day: '2026-11-09' })).rejects.toThrow();
    await expect(repo.addDefusion(store, { thought_text: 'x'.repeat(281), day: '2026-11-09' })).rejects.toThrow();
    await expect(repo.addDefusion(store, { thought_text: 'ok', day: 'today' })).rejects.toThrow();
    await repo.addDefusion(store, { thought_text: 'x'.repeat(280), day: '2026-11-09' });
  });
});

describe('events', () => {
  it('adds with day from starts_at, updates (recomputing day), rates, soft deletes', async () => {
    const start = new Date(2026, 10, 12, 9, 30).toISOString();
    const e = await repo.addEvent(store, { title: 'Exam', starts_at: start });
    expect(e.day).toBe('2026-11-12');
    expect(e.outcome_rating).toBeNull();
    expect(e.reframe_helped).toBeNull();
    const moved = await repo.updateEvent(store, e.id, { starts_at: new Date(2026, 10, 14, 9, 0).toISOString() });
    expect(moved.day).toBe('2026-11-14');
    expect((await repo.updateEvent(store, e.id, { title: 'Final exam' })).title).toBe('Final exam');
    const rated = await repo.rateEvent(store, e.id, { outcome_rating: 4, reframe_helped: 'a_bit' });
    expect(rated.outcome_rating).toBe(4);
    expect(rated.reframe_helped).toBe('a_bit');
    expect(await repo.eventsBetween(store, '2026-11-14', '2026-11-14')).toHaveLength(1);
    expect(await repo.eventsBetween(store, '2026-11-01', '2026-11-13')).toHaveLength(0);
    await repo.deleteEvent(store, e.id);
    expect(await repo.listEvents(store)).toHaveLength(0);
    expect(await store.get('ch03_events', e.id, { includeDeleted: true })).not.toBeNull();
  });

  it('rejects bad input', async () => {
    const start = new Date(2026, 10, 12, 9, 30).toISOString();
    await expect(repo.addEvent(store, { title: ' ', starts_at: start })).rejects.toThrow();
    await expect(repo.addEvent(store, { title: 'x', starts_at: 'nope' })).rejects.toThrow();
    const e = await repo.addEvent(store, { title: 'x', starts_at: start });
    await expect(repo.rateEvent(store, e.id, { outcome_rating: 0, reframe_helped: 'yes' })).rejects.toThrow();
    await expect(repo.rateEvent(store, e.id, { outcome_rating: 6, reframe_helped: 'yes' })).rejects.toThrow();
    await expect(
      repo.rateEvent(store, e.id, { outcome_rating: 3, reframe_helped: 'maybe' as never }),
    ).rejects.toThrow();
    await expect(repo.updateEvent(store, e.id, { starts_at: 'nope' })).rejects.toThrow();
  });
});

describe('series and sessions', () => {
  it('allows only one active series; finishing or stopping frees the slot', async () => {
    expect(await repo.activeSeries(store)).toBeNull();
    const s = await repo.startSeries(store, { topic: 'work', planned_days: 3, start_day: '2026-11-10' });
    expect((await repo.activeSeries(store))?.id).toBe(s.id);
    await expect(repo.startSeries(store, { topic: 'again', planned_days: 4, start_day: '2026-11-10' })).rejects.toThrow();
    expect((await repo.finishSeries(store, s.id)).status).toBe('finished');
    expect(await repo.activeSeries(store)).toBeNull();
    const s2 = await repo.startSeries(store, { topic: 'home', planned_days: 4, start_day: '2026-11-12' });
    expect((await repo.stopSeries(store, s2.id)).status).toBe('stopped');
    expect(await repo.listSeries(store)).toHaveLength(2);
  });

  it('rejects bad topic and planned days', async () => {
    await expect(repo.startSeries(store, { topic: ' ', planned_days: 3, start_day: '2026-11-10' })).rejects.toThrow();
    await expect(repo.startSeries(store, { topic: 'x'.repeat(61), planned_days: 3, start_day: '2026-11-10' })).rejects.toThrow();
    await expect(repo.startSeries(store, { topic: 'a', planned_days: 5, start_day: '2026-11-10' })).rejects.toThrow();
  });

  it('starts and finishes sessions', async () => {
    const s = await repo.startSeries(store, { topic: 'work', planned_days: 3, start_day: '2026-11-10' });
    const a = await repo.startSession(store, { series_id: s.id, day: '2026-11-10', mood_before: 2, minutes: 0 });
    expect(a.mood_after).toBeNull();
    const done = await repo.finishSession(store, a.id, { mood_after: 4, minutes: 15 });
    expect(done.mood_after).toBe(4);
    expect(done.minutes).toBe(15);
    await repo.startSession(store, { series_id: s.id, day: '2026-11-11', mood_before: 3, minutes: 0 });
    expect(await repo.sessionsForSeries(store, s.id)).toHaveLength(2);
    expect(await repo.sessionsForSeries(store, 'other')).toHaveLength(0);
    expect(await repo.sessionsBetween(store, '2026-11-11', '2026-11-12')).toHaveLength(1);
  });

  it('rejects bad moods and minutes', async () => {
    await expect(repo.startSession(store, { series_id: 's', day: '2026-11-10', mood_before: 6, minutes: 0 })).rejects.toThrow();
    await expect(repo.startSession(store, { series_id: 's', day: '2026-11-10', mood_before: 3, minutes: -1 })).rejects.toThrow();
    const a = await repo.startSession(store, { series_id: 's', day: '2026-11-10', mood_before: 3, minutes: 0 });
    await expect(repo.finishSession(store, a.id, { mood_after: 0, minutes: 15 })).rejects.toThrow();
  });
});

describe('gratitude', () => {
  it('is idempotent per day, and unmark soft deletes', async () => {
    const a = await repo.markGratitude(store, '2026-11-10');
    const b = await repo.markGratitude(store, '2026-11-10');
    expect(b.id).toBe(a.id);
    await repo.markGratitude(store, '2026-11-12');
    expect(await repo.gratitudeDays(store)).toEqual(['2026-11-12', '2026-11-10']);
    expect(await repo.gratitudeBetween(store, '2026-11-11', '2026-11-30')).toEqual(['2026-11-12']);
    await repo.unmarkGratitude(store, '2026-11-10');
    expect(await repo.gratitudeDays(store)).toEqual(['2026-11-12']);
    expect(await store.get('ch03_gratitude', a.id, { includeDeleted: true })).not.toBeNull();
    const again = await repo.markGratitude(store, '2026-11-10');
    expect(again.id).not.toBe(a.id);
    await expect(repo.markGratitude(store, 'bad')).rejects.toThrow();
  });
});
