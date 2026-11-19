// End-to-end over a real Store: capture → match (no auto-link) → confirm → signals → card visibility.
import { beforeEach, describe, expect, it } from 'vitest';
import type { Module, Store } from '@mindwell/core';
import { activeModules, buildSignals, coreMigrations, markChapterRead, readChapters } from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBetterSqliteDriver } from '@mindwell/storage-sqlite/testing';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { eveningCardVisible, signals } from './signals';
import { addCapture, capturesOnDay, createStory, linkCapture, storyMatchFor } from './repo';

const ch01: Module = {
  manifest, migrations, signals, screens: [], todayCards: [], prompts: [], reviewSections: [], suggestions: [],
  experiments: [{ technique: 'notice_name', label: 'Notice and name daily', defaultDays: 21 }],
};
const at = new Date(2026, 10, 19, 15);
const D = '2026-11-19';
let store: Store;

async function snapshot() {
  const chapters = await readChapters(store);
  return (await buildSignals({ store, day: D, active: activeModules([ch01], chapters.map((c) => c.chapter)), chapters })).signals;
}

beforeEach(async () => {
  store = createStore(createBetterSqliteDriver());
  await store.migrate('core', coreMigrations);
  await store.migrate('ch01', migrations);
  await markChapterRead(store, 1, at);
});

describe('ch01 end to end', () => {
  it('suggests a story without linking until confirmed', async () => {
    const story = await createStory(store, 'not good enough', D);
    const first = await addCapture(store, { text: 'not good enough for this exam', intensity: 3, at });
    await linkCapture(store, first.id, story.id);
    expect(eveningCardVisible(await snapshot())).toBe(true);

    const second = await addCapture(store, { text: 'the exam will go badly', intensity: null, at });
    expect(await storyMatchFor(store, second.text, at)).toBe(story.id);
    expect((await capturesOnDay(store, D)).find((c) => c.id === second.id)?.story_id).toBeNull();

    await linkCapture(store, second.id, story.id);
    const s = await snapshot();
    expect(s['ch01.captures_today']).toBe(2);
    expect(s['ch01.top_story_7d']).toEqual({ id: story.id, name: 'not good enough', count: 2 });
  });

  it('publishes nothing while Chapter 1 is unread', async () => {
    store = createStore(createBetterSqliteDriver());
    await store.migrate('core', coreMigrations);
    await store.migrate('ch01', migrations);
    const s = await snapshot();
    expect(s['ch01.captures_today']).toBeUndefined();
    expect(s['experiments.available']).toEqual([]);
  });
});
