import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChapterRecord, DayRecord, Store } from '@mindwell/core';
import { CORE_TABLES, coreMigrations, markChapterRead, markChapterUnread, readChapters } from '@mindwell/core';
import { createStore } from './store';
import { createBetterSqliteDriver } from './better-sqlite-driver';

let driver: ReturnType<typeof createBetterSqliteDriver>;
let store: Store;

beforeEach(async () => {
  driver = createBetterSqliteDriver();
  store = createStore(driver);
  await store.migrate('core', coreMigrations);
});
afterEach(() => driver.close());

describe('core migrations', () => {
  it('create every core table and are idempotent', async () => {
    await store.migrate('core', coreMigrations);
    for (const table of Object.values(CORE_TABLES)) {
      await expect(store.list(table)).resolves.toEqual([]);
    }
  });

  it('allow one live row per day, and a new one after soft delete', async () => {
    const row = { day: '2026-11-19', types: '[]', energy: null, intent_prompt_id: null, intent_text: null,
      intent_result: null, rating: null, checkin_at: null, closed_at: null };
    const first = await store.insert<DayRecord>(CORE_TABLES.days, row);
    await expect(store.insert<DayRecord>(CORE_TABLES.days, row)).rejects.toThrow();
    await store.softDelete(CORE_TABLES.days, first.id);
    await expect(store.insert<DayRecord>(CORE_TABLES.days, row)).resolves.toMatchObject({ day: '2026-11-19' });
  });
});

describe('library', () => {
  it('marks a chapter read idempotently, with the local read day', async () => {
    const at = new Date(2026, 10, 19, 2, 30); // 02:30 local → previous day
    const a = await markChapterRead(store, 2, at);
    const b = await markChapterRead(store, 2, at);
    expect(b.id).toBe(a.id);
    expect(a.read_day).toBe('2026-11-18');
    expect((await readChapters(store)).map((r) => r.chapter)).toEqual([2]);
  });

  it('marks unread with a soft delete, and can be read again', async () => {
    await markChapterRead(store, 1);
    await markChapterRead(store, 0);
    await markChapterUnread(store, 1);
    expect((await readChapters(store)).map((r) => r.chapter)).toEqual([0]);
    const all = await store.list<ChapterRecord>(CORE_TABLES.chapters, { includeDeleted: true });
    expect(all).toHaveLength(2);
    await markChapterRead(store, 1);
    expect((await readChapters(store)).map((r) => r.chapter)).toEqual([0, 1]);
  });

  it('rejects a bad chapter number', async () => {
    await expect(markChapterRead(store, -1)).rejects.toThrow(RangeError);
  });
});
