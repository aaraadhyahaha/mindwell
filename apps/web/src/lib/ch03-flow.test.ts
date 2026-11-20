/**
 * Phase 3 check: ch03 over a real Store, with ch01 alongside, through signals only (the
 * snapshot screens and cards get) and the module reminder path the app runs each minute.
 * Module UI isn't needed here, so each module is assembled from its non-UI parts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseRecord, Module, Signals, Store } from '@mindwell/core';
import {
  activeModules,
  buildSignals,
  candidates,
  coreMigrations,
  markChapterRead,
  markChapterUnread,
  pickReminder,
  readChapters,
} from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBetterSqliteDriver } from '@mindwell/storage-sqlite/testing';
import { manifest as m1 } from '../../../../packages/modules/ch01-notice-name/manifest';
import { migrations as mig1 } from '../../../../packages/modules/ch01-notice-name/migrations';
import { signals as sig1 } from '../../../../packages/modules/ch01-notice-name/signals';
import { addCapture, createStory, linkCapture } from '../../../../packages/modules/ch01-notice-name/repo';
import { manifest as m3 } from '../../../../packages/modules/ch03-hard-feelings/manifest';
import { migrations as mig3 } from '../../../../packages/modules/ch03-hard-feelings/migrations';
import { signals as sig3, rateCardVisible, reappraisalCardVisible, sessionCardVisible } from '../../../../packages/modules/ch03-hard-feelings/signals';
import { prompts as prompts3 } from '../../../../packages/modules/ch03-hard-feelings/prompts';
import { suggestions as sugg3 } from '../../../../packages/modules/ch03-hard-feelings/suggestions';
import { reminders as rem3 } from '../../../../packages/modules/ch03-hard-feelings/reminders';
import * as repo from '../../../../packages/modules/ch03-hard-feelings/repo';

const bare = { screens: [], todayCards: [], reviewSections: [], experiments: [] };
const ch01: Module = { ...bare, manifest: m1, migrations: mig1, signals: sig1, prompts: [], suggestions: [] };
const ch03: Module = { ...bare, manifest: m3, migrations: mig3, signals: sig3, prompts: prompts3, suggestions: sugg3, reminders: rem3 };
const registry = [ch01, ch03];
const D = '2026-11-20';
const at = (h: number, min = 0, day = 20) => new Date(2026, 10, day, h, min);

let driver: ReturnType<typeof createBetterSqliteDriver>;
let store: Store;

async function snapshot(now = at(8, 30)): Promise<Signals> {
  const chapters = await readChapters(store);
  const active = activeModules(registry, chapters.map((c) => c.chapter));
  return (await buildSignals({ store, day: D, active, chapters, now: now.toISOString() })).signals;
}

/** What the app's reminder tick does: gather active modules' reminders, pick one. */
async function tick(now: Date, sent: Set<string>) {
  const chapters = await readChapters(store);
  const active = activeModules(registry, chapters.map((c) => c.chapter));
  const ctx = { store, now: now.toISOString(), day: D, morning: '07:30' };
  const list = (await Promise.all(active.flatMap((m) => (m.reminders ?? []).map((r) => r.compute(ctx))))).flat();
  const pick = pickReminder(now.toISOString(), list, sent);
  for (const k of pick.markSent) sent.add(k);
  return pick.show;
}

const libraryIds = (s: Signals, slot: 'morning' | 'evening') =>
  (['intent', 'journal'] as const).flatMap((kind) =>
    candidates({ slot, day: D, prompts: prompts3, signals: s, lastShown: {}, stats: {} }, kind).map((p) => p.prompt.id),
  );

/** Adds an event as if at `when` (sets the row's created/updated time). */
async function addEventAt(when: Date, title: string, startsAt: Date) {
  vi.setSystemTime(when);
  const ev = await repo.addEvent(store, { title, starts_at: startsAt.toISOString() });
  vi.useRealTimers();
  return ev;
}

beforeEach(async () => {
  driver = createBetterSqliteDriver();
  store = createStore(driver);
  await store.migrate('core', coreMigrations);
  await store.migrate('ch01', mig1);
  await store.migrate('ch03', mig3);
  await markChapterRead(store, 1, at(7));
  await markChapterRead(store, 3, at(7));
});

afterEach(() => driver.close());

describe('ch03 events: card, prompt, Coming up, notifications', () => {
  it('shows the reappraisal card and intent the morning of, then the rate card after', async () => {
    const ev = await addEventAt(at(18, 0, 19), 'Statistics exam', at(14));
    const morning = await snapshot(at(8, 30));
    expect(reappraisalCardVisible(morning)).toBe(true);
    expect(rateCardVisible(morning)).toBe(false);
    expect(libraryIds(morning, 'morning')).toContain('ch03.intent.excited');
    expect(morning['upcoming_events']).toContain('Statistics exam, today at 14:00');

    const evening = await snapshot(at(19));
    expect(reappraisalCardVisible(evening)).toBe(false);
    expect(rateCardVisible(evening)).toBe(true);
    await repo.rateEvent(store, ev.id, { outcome_rating: 4, reframe_helped: 'yes' });
    expect(rateCardVisible(await snapshot(at(19, 5)))).toBe(false);
  });

  it('fires morning-of and 60-min reminders once each, catches up once, never after the start', async () => {
    await addEventAt(at(18, 0, 19), 'Statistics exam', at(14));
    const sent = new Set<string>();
    expect(await tick(at(7, 29), sent)).toBeNull();
    expect((await tick(at(7, 30), sent))?.title).toBe('Today: Statistics exam at 14:00');
    expect(await tick(at(7, 31), sent)).toBeNull();
    expect((await tick(at(13, 0), sent))?.title).toBe('Statistics exam in an hour');
    expect(await tick(at(13, 1), sent)).toBeNull();
    expect(await tick(at(14, 0), sent)).toBeNull();

    // Tab closed all morning, back at 13:20: one notification (the latest), not two.
    const later = new Set<string>();
    expect((await tick(at(13, 20), later))?.title).toBe('Statistics exam in an hour');
    expect(await tick(at(13, 21), later)).toBeNull();
    // Back only after it started: nothing.
    expect(await tick(at(14, 5), new Set())).toBeNull();
  });

  it('gives no reminders for a past event, nor for one added after its reminder time', async () => {
    await addEventAt(at(18, 0, 19), 'Past', at(9));
    expect(await tick(at(9, 30), new Set())).toBeNull();
    // Added at 22:30 for 23:00: its 22:00 reminder had already passed, so no instant ping.
    await addEventAt(at(22, 30), 'Soon', at(23));
    expect(await tick(at(22, 31), new Set())).toBeNull();
  });

  it('stops reminding when ch03 is marked unread', async () => {
    await addEventAt(at(18, 0, 19), 'Viva', at(14));
    await markChapterUnread(store, 3);
    expect(await tick(at(13, 0), new Set())).toBeNull();
  });
});

describe('ch03 with ch01: defusion and writing series prompts', () => {
  it('offers defusion and a series for a repeating story, and stops offering a series once one is active', async () => {
    const story = await createStory(store, "I'll fail", '2026-11-10');
    for (let d = 14; d <= 20; d++) {
      const c = await addCapture(store, { text: "I'm going to fail", intensity: 3, at: at(10, 0, d) });
      await linkCapture(store, c.id, story.id);
    }
    const s = await snapshot();
    expect(libraryIds(s, 'morning')).toEqual(expect.arrayContaining(['ch03.defuse_story', 'ch03.offer_series']));

    const cap = (s['ch01.captures_recent'] as { id: string; text: string }[])[0]!;
    const df = await repo.addDefusion(store, { capture_id: cap.id, thought_text: cap.text, day: D });
    expect(df.capture_id).toBe(cap.id);

    await repo.startSeries(store, { topic: 'the exam', planned_days: 3, start_day: D });
    const s2 = await snapshot();
    expect(libraryIds(s2, 'morning')).not.toContain('ch03.offer_series');
    expect(sessionCardVisible(s2)).toBe(true);
  });

  it('degrades without ch01: no captures, no story prompts', async () => {
    await markChapterUnread(store, 1);
    const s = await snapshot();
    expect(s['ch01.captures_recent']).toBeUndefined();
    expect(libraryIds(s, 'morning')).not.toContain('ch03.defuse_story');
  });
});

describe('no journal text is stored', () => {
  it('a full series and gratitude leave only labels, days, minutes and moods', async () => {
    const series = await repo.startSeries(store, { topic: 'the move', planned_days: 3, start_day: '2026-11-18' });
    for (const [d, b, a] of [['2026-11-18', 2, 3], ['2026-11-19', 2, 4], [D, 3, 4]] as const) {
      const x = await repo.startSession(store, { series_id: series.id, day: d, mood_before: b, minutes: 0 });
      await repo.finishSession(store, x.id, { mood_after: a, minutes: 15 });
    }
    await repo.finishSeries(store, series.id);
    await repo.markGratitude(store, D);

    const shared = ['id', 'created_at', 'updated_at', 'deleted_at', 'schema_version'];
    const cols = async (t: string) => Object.keys((await store.list<BaseRecord>(t))[0]!).sort();
    expect(await cols('ch03_sessions')).toEqual([...shared, 'day', 'minutes', 'mood_after', 'mood_before', 'series_id'].sort());
    expect(await cols('ch03_gratitude')).toEqual([...shared, 'day'].sort());

    const s = await snapshot();
    expect(sessionCardVisible(s)).toBe(false);
    const sugg = sugg3.map((r) => r.evaluate(s, { day: D })).filter(Boolean);
    expect(sugg.map((x) => x!.text)).toContain("Your writing series on 'the move' left you calmer on average.");
  });
});
