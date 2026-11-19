import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { coreMigrations } from '@mindwell/core';
import type { Store } from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBetterSqliteDriver } from '@mindwell/storage-sqlite/testing';
import { migrations } from './migrations';
import { discardRecord, getRecord, listDrafts, listRecords, recordsBetween, saveDraft, startRecord } from './repo';

let driver: ReturnType<typeof createBetterSqliteDriver>;
let store: Store;

beforeEach(async () => {
  driver = createBetterSqliteDriver();
  store = createStore(driver);
  await store.migrate('core', coreMigrations);
  await store.migrate('ch02', migrations);
});
afterEach(() => driver.close());

const capture = { id: 'cap1', text: 'I always fail', story_id: 'st1' };

describe('ch02 repo', () => {
  it('starts a blank record', async () => {
    const r = await startRecord(store, { day: '2026-11-10' });
    expect(r.automatic_thought).toBe('');
    expect(r.capture_id).toBeNull();
    expect(r.complete).toBe(0);
  });

  it('prefills thought and story from a capture, and resumes on restart', async () => {
    const a = await startRecord(store, { day: '2026-11-10', capture });
    expect(a.automatic_thought).toBe('I always fail');
    expect(a.story_id).toBe('st1');
    const b = await startRecord(store, { day: '2026-11-11', capture });
    expect(b.id).toBe(a.id);
    expect(await listRecords(store)).toHaveLength(1);
  });

  it('sets complete only when steps 2, 3 and 8 are filled', async () => {
    const r = await startRecord(store, { day: '2026-11-10', capture });
    expect((await saveDraft(store, r.id, { feeling: 'dread', intensity_before: 80 })).complete).toBe(0);
    const done = await saveDraft(store, r.id, { intensity_after: 40 });
    expect(done.complete).toBe(1);
    expect((await saveDraft(store, r.id, { feeling: '  ' })).complete).toBe(0);
    expect((await saveDraft(store, r.id, { feeling: 'dread', intensity_after: null })).complete).toBe(0);
  });

  it('rejects bad intensities', async () => {
    const r = await startRecord(store, { day: '2026-11-10' });
    await expect(saveDraft(store, r.id, { intensity_before: 101 })).rejects.toThrow();
    await expect(saveDraft(store, r.id, { intensity_after: 1.5 })).rejects.toThrow();
    expect((await getRecord(store, r.id))?.intensity_before).toBeNull();
  });

  it('lists drafts without complete records', async () => {
    const a = await startRecord(store, { day: '2026-11-10' });
    const b = await startRecord(store, { day: '2026-11-10', capture });
    await saveDraft(store, b.id, { feeling: 'x', intensity_before: 50, intensity_after: 20 });
    expect((await listDrafts(store)).map((r) => r.id)).toEqual([a.id]);
  });

  it('filters by day and hides discarded records', async () => {
    const a = await startRecord(store, { day: '2026-11-10' });
    await startRecord(store, { day: '2026-11-20' });
    expect(await recordsBetween(store, '2026-11-01', '2026-11-10')).toHaveLength(1);
    await discardRecord(store, a.id);
    expect(await getRecord(store, a.id)).toBeNull();
    expect(await listRecords(store)).toHaveLength(1);
  });
});
