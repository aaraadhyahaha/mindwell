import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Module, Signals, Store, SuggestionRecord, SuggestionRule } from '@mindwell/core';
import { CORE_TABLES, collectRecords, coreMigrations, decideSuggestion, reviewSuggestions } from '@mindwell/core';
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

function mod(id: string, suggestions: SuggestionRule[]): Module<unknown> {
  return {
    manifest: { id, chapter: 1, title: id, idea: '', evidence: '', references: [] },
    migrations: [], screens: [], todayCards: [], prompts: [], signals: [],
    reviewSections: [], suggestions, experiments: [],
  };
}
const rule = (id: string, key: string): SuggestionRule => ({
  id,
  evaluate: () => ({ key, text: `text ${key}`, reason: `reason ${key}` }),
});
const signals: Signals = {};

describe('reviewSuggestions', () => {
  it('inserts new proposals as open with the given day', async () => {
    const active = [mod('ch01', [rule('r1', 'k1')])];
    const { open, failed } = await reviewSuggestions({ store, day: '2026-11-19', active, signals });
    expect(failed).toEqual([]);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({
      rule_id: 'r1', module: 'ch01', key: 'k1', text: 'text k1', reason: 'reason k1',
      day: '2026-11-19', status: 'open', decided_at: null,
    });
    const stored = await store.list<SuggestionRecord>(CORE_TABLES.suggestions);
    expect(stored).toHaveLength(1);
  });

  it('does not duplicate on a second run', async () => {
    const active = [mod('ch01', [rule('r1', 'k1')])];
    await reviewSuggestions({ store, day: '2026-11-19', active, signals });
    const second = await reviewSuggestions({ store, day: '2026-11-20', active, signals });
    expect(second.open).toHaveLength(1);
    expect(second.open[0]!.day).toBe('2026-11-19');
    expect(await store.list(CORE_TABLES.suggestions)).toHaveLength(1);
  });

  it('does not re-propose a dismissed key and leaves it out of open', async () => {
    const active = [mod('ch01', [rule('r1', 'k1')])];
    const first = await reviewSuggestions({ store, day: '2026-11-19', active, signals });
    await decideSuggestion(store, first.open[0]!.id, 'dismissed');
    const again = await reviewSuggestions({ store, day: '2026-11-26', active, signals });
    expect(again.open).toEqual([]);
    expect(await store.list(CORE_TABLES.suggestions)).toHaveLength(1);
  });

  it('does not re-propose an accepted key either', async () => {
    const active = [mod('ch01', [rule('r1', 'k1')])];
    const first = await reviewSuggestions({ store, day: '2026-11-19', active, signals });
    await decideSuggestion(store, first.open[0]!.id, 'accepted');
    const again = await reviewSuggestions({ store, day: '2026-11-26', active, signals });
    expect(again.open).toEqual([]);
    expect(await store.list(CORE_TABLES.suggestions)).toHaveLength(1);
  });

  it('lists open suggestions oldest first', async () => {
    await reviewSuggestions({ store, day: '2026-11-12', active: [mod('ch01', [rule('r1', 'old')])], signals });
    const res = await reviewSuggestions({
      store, day: '2026-11-19', active: [mod('ch02', [rule('r2', 'new')])], signals,
    });
    expect(res.open.map((s) => s.key)).toEqual(['old', 'new']);
    expect(res.open.map((s) => s.day)).toEqual(['2026-11-12', '2026-11-19']);
  });

  it('reports failed rules and still stores the others', async () => {
    const bad: SuggestionRule = { id: 'bad', evaluate: () => { throw new Error('nope'); } };
    const res = await reviewSuggestions({
      store, day: '2026-11-19', active: [mod('ch01', [bad, rule('ok', 'k')])], signals,
    });
    expect(res.failed).toHaveLength(1);
    expect(res.failed[0]).toMatchObject({ module: 'ch01', rule_id: 'bad' });
    expect(res.open.map((s) => s.key)).toEqual(['k']);
  });
});

describe('decideSuggestion', () => {
  it('sets status and decided_at', async () => {
    const { open } = await reviewSuggestions({
      store, day: '2026-11-19', active: [mod('ch01', [rule('r1', 'k1')])], signals,
    });
    const at = new Date('2026-11-19T12:34:56.000Z');
    const updated = await decideSuggestion(store, open[0]!.id, 'accepted', at);
    expect(updated.status).toBe('accepted');
    expect(updated.decided_at).toBe('2026-11-19T12:34:56.000Z');
    const reloaded = await store.get<SuggestionRecord>(CORE_TABLES.suggestions, open[0]!.id);
    expect(reloaded).toMatchObject({ status: 'accepted', decided_at: '2026-11-19T12:34:56.000Z' });
  });
});

describe('collectRecords', () => {
  it('includes core tables, includes soft-deleted rows, excludes _migrations', async () => {
    const day = await store.insert(CORE_TABLES.days, {
      day: '2026-11-19', types: '[]', energy: null, intent_prompt_id: null, intent_text: null,
      intent_result: null, rating: null, checkin_at: null, closed_at: null,
    });
    await store.softDelete(CORE_TABLES.days, day.id);
    const dump = await collectRecords(store);
    for (const table of Object.values(CORE_TABLES)) {
      expect(dump).toHaveProperty(table);
    }
    expect(dump[CORE_TABLES.days]).toHaveLength(1);
    expect(dump[CORE_TABLES.days]![0]!.deleted_at).not.toBeNull();
    expect(Object.keys(dump)).not.toContain('_migrations');
  });
});
