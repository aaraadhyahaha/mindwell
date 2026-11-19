/**
 * Phase 2 check: ch01 → ch02 across the module boundary, over a real Store, through
 * signals only (the same snapshot the screens get). Module UI isn't needed here, so
 * each module is assembled from its non-UI parts.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Module, Signals, Store } from '@mindwell/core';
import { activeModules, buildSignals, coreMigrations, markChapterRead, readChapters, markChapterUnread } from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBetterSqliteDriver } from '@mindwell/storage-sqlite/testing';
import { manifest as m1 } from '../../../../packages/modules/ch01-notice-name/manifest';
import { migrations as mig1 } from '../../../../packages/modules/ch01-notice-name/migrations';
import { signals as sig1, thoughtRecordHref } from '../../../../packages/modules/ch01-notice-name/signals';
import { addCapture, createStory, linkCapture } from '../../../../packages/modules/ch01-notice-name/repo';
import { manifest as m2 } from '../../../../packages/modules/ch02-thought-records/manifest';
import { migrations as mig2 } from '../../../../packages/modules/ch02-thought-records/migrations';
import { signals as sig2 } from '../../../../packages/modules/ch02-thought-records/signals';
import { prompts as prompts2 } from '../../../../packages/modules/ch02-thought-records/prompts';
import { suggestions as sugg2 } from '../../../../packages/modules/ch02-thought-records/suggestions';
import { findCapture, startParams } from '../../../../packages/modules/ch02-thought-records/form';
import { listDrafts, saveDraft, startRecord } from '../../../../packages/modules/ch02-thought-records/repo';

const bare = { screens: [], todayCards: [], reviewSections: [], experiments: [] };
const ch01: Module = { ...bare, manifest: m1, migrations: mig1, signals: sig1, prompts: [], suggestions: [] };
const ch02: Module = { ...bare, manifest: m2, migrations: mig2, signals: sig2, prompts: prompts2, suggestions: sugg2 };
const registry = [ch01, ch02];
const D = '2026-11-19';
const at = (h: number, day = 19) => new Date(2026, 10, day, h);

let driver: ReturnType<typeof createBetterSqliteDriver>;
let store: Store;

async function snapshot(): Promise<Signals> {
  const chapters = await readChapters(store);
  const active = activeModules(registry, chapters.map((c) => c.chapter));
  return (await buildSignals({ store, day: D, active, chapters })).signals;
}

beforeEach(async () => {
  driver = createBetterSqliteDriver();
  store = createStore(driver);
  await store.migrate('core', coreMigrations);
  await store.migrate('ch01', mig1);
  await store.migrate('ch02', mig2);
  await markChapterRead(store, 1, at(8));
  await markChapterRead(store, 2, at(8));
});

afterEach(() => driver.close());

describe('ch02 started from a ch01 capture', () => {
  it('pre-fills the thought and story from the evening card link', async () => {
    const story = await createStory(store, "I'll fail", D);
    const cap = await addCapture(store, { text: "I'm going to blank on question one.", intensity: 4, at: at(9) });
    await linkCapture(store, cap.id, story.id);

    const s = await snapshot();
    const href = thoughtRecordHref(s, cap.id)!;
    expect(href).toBe(`/m/ch02/new?capture=${cap.id}`);

    const found = findCapture(s, startParams(href.split('?')[1]!).capture);
    expect(found).toEqual({ id: cap.id, text: "I'm going to blank on question one.", story_id: story.id });
    const r = await startRecord(store, { day: D, capture: found });
    expect(r.automatic_thought).toBe("I'm going to blank on question one.");
    expect(r.story_id).toBe(story.id);
    expect(r.capture_id).toBe(cap.id);
  });

  it('feeds story_trend and the weakening suggestion once records are complete', async () => {
    const story = await createStory(store, "I'll fail", D);
    const pairs: [number, number][] = [[80, 60], [70, 55], [60, 45]];
    for (const [i, [before, after]] of pairs.entries()) {
      const cap = await addCapture(store, { text: `thought ${i}`, intensity: 3, at: at(9 + i) });
      await linkCapture(store, cap.id, story.id);
      const r = await startRecord(store, { day: D, capture: findCapture(await snapshot(), cap.id) });
      await saveDraft(store, r.id, { feeling: 'anxious', intensity_before: before, intensity_after: after });
    }
    const s = await snapshot();
    expect(s['ch02.records_7d']).toBe(3);
    expect(s['ch02.story_trend']).toEqual([{ story_id: story.id, name: "I'll fail", first_before: 80, last_after: 45, n: 3 }]);
    expect(s['ch02.unchallenged_story']).toBeNull();
    const fired = sugg2.map((r) => r.evaluate(s, { day: D })).filter(Boolean);
    expect(fired.map((f) => f!.text)).toEqual(["'I'll fail' went from 80 to 45 across 3 records."]);
  });

  it('flags a story with 3 captures this week and no record as unchallenged', async () => {
    const story = await createStory(store, 'Not good enough', D);
    for (let i = 0; i < 3; i++) {
      const cap = await addCapture(store, { text: `t${i}`, intensity: 2, at: at(9 + i) });
      await linkCapture(store, cap.id, story.id);
    }
    const s = await snapshot();
    expect(s['ch02.unchallenged_story']).toEqual({ id: story.id, name: 'Not good enough' });
    const ids = prompts2.filter((p) => p.condition(s)).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['ch02.intent.fair_judge', 'ch02.evidence_against']));
  });
});

describe('ch02 with ch01 inactive', () => {
  it('works without capture links or unchallenged_story', async () => {
    await markChapterUnread(store, 1);
    const r = await startRecord(store, { day: D, capture: null });
    await saveDraft(store, r.id, { automatic_thought: 'x', feeling: 'sad', intensity_before: 70, intensity_after: 40 });
    const s = await snapshot();
    expect('ch02.unchallenged_story' in s).toBe(false);
    expect(s['ch02.records_7d']).toBe(1);
    expect(s['ch02.avg_drop_7d']).toBe(30);
    expect(s['ch02.story_trend']).toEqual([]);
    expect(findCapture(s, 'anything')).toBeUndefined();
    expect(sugg2.map((x) => x.evaluate(s, { day: D }))).toEqual([null, null]);
  });

  it('keeps an incomplete record as a draft', async () => {
    const r = await startRecord(store, { day: D });
    await saveDraft(store, r.id, { situation: 'before the test' });
    expect((await listDrafts(store)).map((d) => d.id)).toEqual([r.id]);
  });
});
