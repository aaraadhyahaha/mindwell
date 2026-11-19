process.env.TZ = 'Europe/Berlin';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { coreMigrations } from '@mindwell/core';
import type { Store } from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBetterSqliteDriver } from '@mindwell/storage-sqlite/testing';
import { migrations } from './migrations';
import { addCapture, capturesOnDay, createStory, linkCapture, storyMatchFor } from './repo';

let driver: ReturnType<typeof createBetterSqliteDriver>;
let store: Store;

beforeEach(async () => {
  driver = createBetterSqliteDriver();
  store = createStore(driver);
  await store.migrate('core', coreMigrations);
  await store.migrate('ch01', migrations);
});
afterEach(() => driver.close());

describe('ch01 repo', () => {
  it('assigns the day with the 04:00 boundary', async () => {
    const late = await addCapture(store, { text: 'late', intensity: null, at: new Date(2026, 10, 10, 3, 30) });
    const morning = await addCapture(store, { text: 'morning', intensity: 3, at: new Date(2026, 10, 10, 4, 30) });
    expect(late.day).toBe('2026-11-09');
    expect(morning.day).toBe('2026-11-10');
    expect(morning.story_id).toBeNull();
    expect((await capturesOnDay(store, '2026-11-10')).map((c) => c.text)).toEqual(['morning']);
  });

  it('links and unlinks a capture', async () => {
    const s = await createStory(store, 'not good enough', '2026-11-10');
    const c = await addCapture(store, { text: 'x', intensity: null, at: new Date(2026, 10, 10, 12) });
    expect((await linkCapture(store, c.id, s.id)).story_id).toBe(s.id);
    expect((await linkCapture(store, c.id, null)).story_id).toBeNull();
  });

  it('reuses a story with the same name, ignoring case', async () => {
    const a = await createStory(store, 'Deadlines', '2026-11-10');
    const b = await createStory(store, '  deadlines ', '2026-11-11');
    expect(b.id).toBe(a.id);
  });

  it('suggests a story from past captures', async () => {
    const s = await createStory(store, 'deadlines', '2026-11-10');
    const c = await addCapture(store, { text: 'report due', intensity: null, at: new Date(2026, 10, 10, 12) });
    await linkCapture(store, c.id, s.id);
    expect(await storyMatchFor(store, 'report again', new Date(2026, 10, 12, 12))).toBe(s.id);
  });
});
