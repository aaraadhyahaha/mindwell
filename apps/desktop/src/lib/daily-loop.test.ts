/**
 * Phase 0 check: the whole daily loop over two days with the dev module, through
 * the same core and Store calls the Today, Week and Settings screens make.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseRecord, DayRecord, Module, NewRecord, PromptShownRecord, Store } from '@mindwell/core';
import {
  CORE_TABLES,
  activeModules,
  buildSignals,
  collectRecords,
  coreMigrations,
  decideSuggestion,
  exportJson,
  exportMarkdown,
  loadPromptHistory,
  markChapterRead,
  promptLibrary,
  recordShown,
  recordSwap,
  reviewSuggestions,
  selectPrompts,
  setFeedback,
  showAnother,
  shownInSlot,
  weekSummary,
} from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBetterSqliteDriver } from '@mindwell/storage-sqlite/testing';
import { contextLines, selectionFromRows } from './today';
import { dueReminders } from './reminders';

vi.mock('../../../../packages/modules/dev-test/ui/NotesCard.svelte', () => ({ default: 'NotesCard' }));
vi.mock('../../../../packages/modules/dev-test/ui/ReviewSection.svelte', () => ({ default: 'ReviewSection' }));
const { module: dev } = await import('@mindwell/module-dev-test');

const D1 = '2026-11-18';
const D2 = '2026-11-19';
const reminders = { morning: '07:30', morningOn: true, evening: '21:30', eveningOn: true };

let driver: ReturnType<typeof createBetterSqliteDriver>;
let store: Store;
let active: Module<unknown>[];

beforeEach(async () => {
  driver = createBetterSqliteDriver();
  store = createStore(driver);
  await store.migrate('core', coreMigrations);
  await store.migrate(dev.manifest.id, dev.migrations);
  await markChapterRead(store, dev.manifest.chapter, new Date(2026, 10, 10, 12));
  active = activeModules([dev as Module<unknown>], [dev.manifest.chapter]);
});

afterEach(() => driver.close());

const EMPTY_DAY: NewRecord<DayRecord> = {
  day: '',
  types: '[]',
  energy: null,
  intent_prompt_id: null,
  intent_text: null,
  intent_result: null,
  rating: null,
  checkin_at: null,
  closed_at: null,
};

async function dayRow(day: string): Promise<DayRecord | null> {
  const [r] = await store.list<DayRecord>(CORE_TABLES.days, { where: { day }, limit: 1 });
  return r ?? null;
}

async function input(day: string, slot: 'morning' | 'evening') {
  const { signals } = await buildSignals({ store, day, active });
  const { lastShown, stats } = await loadPromptHistory(store);
  return { slot, day, prompts: promptLibrary([dev as Module<unknown>], [dev.manifest.chapter]), signals, lastShown, stats };
}

/** Morning check-in as Today does it. Returns the recorded rows. */
async function morning(day: string, types: string[], energy: number, intent: string) {
  const row = await store.insert<DayRecord>(CORE_TABLES.days, { ...EMPTY_DAY, day, types: JSON.stringify(types), energy });
  const inp = await input(day, 'morning');
  const sel = selectPrompts(inp);
  const picks = [...(sel.intent ? [sel.intent] : []), ...sel.journal];
  const rows: PromptShownRecord[] = [];
  for (const [i, p] of picks.entries()) rows.push(await recordShown(store, day, 'morning', p, i));
  await store.update<DayRecord>(CORE_TABLES.days, row.id, {
    intent_prompt_id: sel.intent?.prompt.id ?? null,
    intent_text: intent,
    checkin_at: new Date().toISOString(),
  });
  return { inp, sel, rows };
}

describe('daily loop with the dev module', () => {
  it('runs morning, evening, next morning, weekly review and export', async () => {
    // ---- Day 1 morning ----
    expect(dueReminders(new Date(2026, 10, 18, 7, 31), reminders, null, { morning: null, evening: null })).toEqual(['morning']);

    const m1 = await morning(D1, ['light'], 4, 'Finish the outline.');
    expect(m1.sel.intent).not.toBeNull();
    expect(m1.sel.journal.map((p) => p.prompt.id)).toEqual(['dev.journal.test']);
    expect(dueReminders(new Date(2026, 10, 18, 7, 40), reminders, await dayRow(D1), { morning: null, evening: null })).toEqual([]);

    // Show another on the intent: the other eligible intent replaces it; the old row stays as shown.
    const intentRow = m1.rows[0]!;
    const swap = showAnother(m1.inp, m1.sel, intentRow.prompt_id, m1.rows.map((r) => r.prompt_id));
    expect(swap).not.toBeNull();
    const newIntentRow = await recordSwap(store, intentRow.id, swap!.next);
    expect(new Set([intentRow.prompt_id, newIntentRow.prompt_id])).toEqual(new Set(['core.intent.light_day', 'dev.intent.test']));

    // Feedback on the journal prompt reaches prompt_scores.
    await setFeedback(store, m1.rows[1]!.id, 'useful');
    expect((await loadPromptHistory(store)).stats['dev.journal.test']).toEqual({ rated: 1, useful: 1 });

    // Reopening Today rebuilds the same screen from the log.
    const reopened = selectionFromRows(await shownInSlot(store, D1, 'morning'), m1.inp.prompts);
    expect(reopened.intent?.prompt.id).toBe(newIntentRow.prompt_id);
    expect(reopened.journal.map((p) => p.prompt.id)).toEqual(['dev.journal.test']);

    // ---- Day 1 evening ----
    // What the dev evening card does when you add a note.
    await store.insert<BaseRecord & { day: string; body: string }>('dev_notes', { day: D1, body: 'Wired the loop.' });
    const d1 = (await dayRow(D1))!;
    await store.update<DayRecord>(CORE_TABLES.days, d1.id, { intent_result: 'kept', rating: 2 });
    const ev = await input(D1, 'evening');
    const evening = selectPrompts(ev);
    // dev.journal.test is on a 1-day cooldown, so only the core reflection qualifies.
    expect(evening.intent).toBeNull();
    expect(evening.journal.map((p) => p.prompt.id)).toEqual(['core.evening.surprise']);
    await recordShown(store, D1, 'evening', evening.journal[0]!, 0);
    expect(dev.todayCards.filter((c) => c.slot === 'evening' && c.visible(ev.signals))).toHaveLength(1);
    expect(ev.signals['dev.notes_today']).toBe(1);
    await store.update<DayRecord>(CORE_TABLES.days, d1.id, { closed_at: new Date().toISOString() });
    expect(dueReminders(new Date(2026, 10, 18, 21, 45), reminders, await dayRow(D1), { morning: D1, evening: null })).toEqual([]);

    // ---- Day 2 morning: yesterday was hard, so its prompt appears; context strip reads yesterday ----
    const m2 = await morning(D2, [], 3, 'One small step on the draft.');
    expect(m2.sel.journal.map((p) => p.prompt.id)).toContain('core.journal.hard_yesterday');
    const y = (await dayRow(D1))!;
    expect(contextLines(m2.inp.signals, y)).toEqual(['Yesterday: 2 of 5', "Yesterday's intent: Finish the outline. (kept)"]);

    // ---- Weekly review on day 2 ----
    const summary = weekSummary(D2, await store.list<DayRecord>(CORE_TABLES.days));
    expect(summary).toMatchObject({ checkins: 2, closes: 1, intents: { kept: 1, partly: 0, not: 0 }, meanRating: 2 });
    expect(dev.reviewSections).toHaveLength(1);
    const { signals } = await buildSignals({ store, day: D2, active });
    const first = await reviewSuggestions({ store, day: D2, active, signals });
    expect(first.open.map((s) => s.key)).toEqual(['dev.try_a_note']);
    await decideSuggestion(store, first.open[0]!.id, 'dismissed');
    expect((await reviewSuggestions({ store, day: D2, active, signals })).open).toEqual([]);

    // ---- Export ----
    const dump = await collectRecords(store);
    expect(Object.keys(dump)).toEqual(expect.arrayContaining(['days', 'prompts_shown', 'prompt_scores', 'suggestions', 'dev_notes', 'chapters']));
    const json = JSON.parse(exportJson(dump, '2026-11-19T20:00:00.000Z')) as { tables: Record<string, unknown[]> };
    expect(json.tables['prompts_shown']).toHaveLength(m1.rows.length + 1 + 1 + m2.rows.length);
    const md = exportMarkdown(dump, '2026-11-19T20:00:00.000Z');
    expect(md).toContain('Finish the outline.');
    expect(md).toContain('Wired the loop.');
  });
});
