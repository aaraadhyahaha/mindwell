// End-to-end over a real Store: activation → signals → card visibility → verdicts.
import { beforeEach, describe, expect, it } from 'vitest';
import type { Module, Store } from '@mindwell/core';
import { activeModules, addDays, buildSignals, coreMigrations, markChapterRead, readChapters } from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBetterSqliteDriver } from '@mindwell/storage-sqlite/testing';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { signals, verdictCardVisible } from './signals';
import { extendExperiment, setVerdict, startExperiment } from './repo';

const fake = (id: string, chapter: number): Module => ({
  manifest: { id, chapter, title: id, idea: '', evidence: '', references: [] },
  migrations: [],
  screens: [],
  todayCards: [],
  prompts: [],
  signals: [],
  reviewSections: [],
  suggestions: [],
  experiments: [{ technique: `${id}_tech`, label: `${id} technique`, defaultDays: 21 }],
});
const intro: Module = { ...fake('intro', 0), manifest, migrations, signals, experiments: [] };
const registry = [intro, fake('ch01', 1), fake('ch02', 2)];
const D = '2026-11-02';
let store: Store;

async function snapshot(day: string) {
  const chapters = await readChapters(store);
  const active = activeModules(registry, chapters.map((c) => c.chapter));
  return (await buildSignals({ store, day, active, chapters })).signals;
}

beforeEach(async () => {
  store = createStore(createBetterSqliteDriver());
  await store.migrate('core', coreMigrations);
  await store.migrate('intro', intro.migrations);
  await markChapterRead(store, 0, new Date(2026, 10, 2, 12));
  await markChapterRead(store, 1, new Date(2026, 10, 2, 12));
});

describe('intro end to end', () => {
  it("offers only active modules' techniques", async () => {
    const s = await snapshot(D);
    expect(s['experiments.available']).toEqual([
      { module: 'ch01', technique: 'ch01_tech', label: 'ch01 technique', default_days: 21 },
    ]);
  });

  it('shows the verdict card on the ending day, then extend and keep work', async () => {
    const card = { visible: verdictCardVisible };
    const e = await startExperiment(store, { module: 'ch01', technique: 'ch01_tech', label: 'ch01 technique', hypothesis: 'Calmer', days: 21, day: D });
    expect(card.visible(await snapshot(addDays(D, 19)))).toBe(false);
    const end = addDays(D, 20);
    expect(card.visible(await snapshot(end))).toBe(true);

    const extended = await extendExperiment(store, e.id, 7, 'Not sure yet');
    expect(extended.end_day).toBe(addDays(end, 7));
    expect(card.visible(await snapshot(end))).toBe(false);

    await setVerdict(store, e.id, 'keep', 'Helped');
    const s = await snapshot(addDays(end, 7));
    expect(card.visible(s)).toBe(false);
    expect(s['intro.active']).toEqual([]);
  });
});
