import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DayRecord, Module, PickedPrompt, PromptScoreRecord, Store } from '@mindwell/core';
import {
  CORE_TABLES, NAME_SETTING, buildSignals, coreMigrations, corePrompts, loadPromptHistory,
  markChapterRead, recordShown, recordSwap, setFeedback, shownInSlot,
} from '@mindwell/core';
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

const pick = (i: number): PickedPrompt => ({ prompt: corePrompts[i]!, text: corePrompts[i]!.text, score: 1, fallback: false });
const day = (d: string, extra: Partial<DayRecord> = {}) => ({
  day: d, types: '[]', energy: null, intent_prompt_id: null, intent_text: null, intent_result: null,
  rating: null, checkin_at: null, closed_at: null, ...extra,
});

describe('prompt log', () => {
  it('records shown prompts, swaps, and last-shown days', async () => {
    const a = await recordShown(store, '2026-11-18', 'morning', pick(2), 0);
    await recordShown(store, '2026-11-19', 'morning', pick(2), 0);
    const next = await recordSwap(store, a.id, pick(3));
    expect(next).toMatchObject({ day: '2026-11-18', position: 0, prompt_id: 'core.journal.hard_yesterday' });
    const slot = await shownInSlot(store, '2026-11-18', 'morning');
    expect(slot.map((r) => [r.prompt_id, r.replaced])).toEqual([['core.journal.default', 1], ['core.journal.hard_yesterday', 0]]);
    const { lastShown } = await loadPromptHistory(store);
    expect(lastShown).toEqual({ 'core.journal.default': '2026-11-19', 'core.journal.hard_yesterday': '2026-11-18' });
  });

  it('keeps prompt_scores in step when feedback is set, changed and cleared', async () => {
    const a = await recordShown(store, '2026-11-19', 'morning', pick(2), 0);
    const b = await recordShown(store, '2026-11-19', 'morning', pick(2), 1);
    const scores = async () => (await store.list<PromptScoreRecord>(CORE_TABLES.promptScores)).map((s) => [s.rated, s.useful]);
    await setFeedback(store, a.id, 'useful');
    expect(await scores()).toEqual([[1, 1]]);
    await setFeedback(store, a.id, 'useful');
    expect(await scores()).toEqual([[1, 1]]);
    await setFeedback(store, b.id, 'not_useful');
    expect(await scores()).toEqual([[2, 1]]);
    await setFeedback(store, a.id, 'not_useful');
    expect(await scores()).toEqual([[2, 0]]);
    await setFeedback(store, a.id, null);
    expect(await scores()).toEqual([[1, 0]]);
    expect((await loadPromptHistory(store)).stats).toEqual({ 'core.journal.default': { rated: 1, useful: 0 } });
  });
});

describe('buildSignals', () => {
  const dev: Module = {
    manifest: { id: 'dev', chapter: 100, title: 'dev', idea: '', evidence: '', references: [] },
    migrations: [], screens: [], todayCards: [], prompts: [], reviewSections: [], suggestions: [], experiments: [],
    signals: [
      { key: 'dev.count', compute: async ({ day }) => day.length },
      { key: 'dev.upcoming_events', compute: async () => [{ title: 'Exam' }] },
      { key: 'dev.broken', compute: async () => { throw new Error('boom'); } },
    ],
  };

  it('combines core and active module signals, dropping ones that throw', async () => {
    await store.insert<DayRecord>(CORE_TABLES.days, day('2026-11-19', { types: '["light","exam"]', energy: 4 }));
    await store.insert<DayRecord>(CORE_TABLES.days, day('2026-11-18', { rating: 2, intent_result: 'partly' }));
    await store.insert(CORE_TABLES.settings, { key: NAME_SETTING, value: JSON.stringify(' Sam ') });
    await markChapterRead(store, 100, new Date(2026, 10, 10, 12));
    const { signals, failed } = await buildSignals({ store, day: '2026-11-19', active: [dev] });
    expect(signals).toEqual({
      'dev.count': 10,
      'dev.upcoming_events': [{ title: 'Exam' }],
      'day.types': ['light', 'exam'],
      'day.energy': 4,
      'day.rating': null,
      'yesterday.rating': 2,
      'yesterday.intent_result': 'partly',
      'user.name': 'Sam',
      upcoming_events: [{ title: 'Exam' }],
      'chapters.recently_unlocked': ['dev'],
    });
    expect(failed.map((f) => f.key)).toEqual(['dev.broken']);
  });

  it('gives nulls and empty lists with no data and no active modules', async () => {
    const { signals } = await buildSignals({ store, day: '2026-11-19', active: [] });
    expect(signals['day.types']).toEqual([]);
    expect(signals['yesterday.rating']).toBeNull();
    expect(signals['user.name']).toBeNull();
    expect(signals['chapters.recently_unlocked']).toEqual([]);
  });
});
