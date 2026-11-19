import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { coreMigrations } from '@mindwell/core';
import type { Store } from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBetterSqliteDriver } from '@mindwell/storage-sqlite/testing';
import { migrations } from './migrations';
import {
  ExperimentLimitError,
  activeExperiments,
  endEarly,
  extendExperiment,
  listCheckins,
  saveCheckin,
  setVerdict,
  startExperiment,
} from './repo';

let driver: ReturnType<typeof createBetterSqliteDriver>;
let store: Store;

beforeEach(async () => {
  driver = createBetterSqliteDriver();
  store = createStore(driver);
  await store.migrate('core', coreMigrations);
  await store.migrate('intro', migrations);
});
afterEach(() => driver.close());

const start = (n: number, day = '2026-11-01') =>
  startExperiment(store, {
    module: 'ch01', technique: `t${n}`, label: `Technique ${n}`, hypothesis: 'It helps', days: 21, day,
  });

describe('intro repo', () => {
  it('computes end_day inclusively', async () => {
    const e = await start(1);
    expect(e.end_day).toBe('2026-11-21');
  });

  it('refuses a 4th active experiment', async () => {
    await start(1);
    await start(2);
    await start(3);
    await expect(start(4)).rejects.toBeInstanceOf(ExperimentLimitError);
    expect(await activeExperiments(store)).toHaveLength(3);
  });

  it('extend moves end_day and stays active', async () => {
    const e = await start(1);
    const x = await extendExperiment(store, e.id, 7, 'more time');
    expect(x.end_day).toBe('2026-11-28');
    expect(x.status).toBe('active');
    expect(x.verdict).toBe('extend');
    expect(x.note).toBe('more time');
  });

  it('keep ends it and frees a slot', async () => {
    const e = await start(1);
    await start(2);
    await start(3);
    const k = await setVerdict(store, e.id, 'keep', 'worked');
    expect(k).toMatchObject({ status: 'ended', verdict: 'keep', note: 'worked' });
    await expect(start(4)).resolves.toBeTruthy();
  });

  it('endEarly sets end_day', async () => {
    const e = await start(1);
    expect((await endEarly(store, e.id, '2026-11-10')).end_day).toBe('2026-11-10');
  });

  it('check-in upserts within a week and adds after', async () => {
    const e = await start(1);
    await saveCheckin(store, { experimentId: e.id, day: '2026-11-08', rating: 2, note: '' });
    await saveCheckin(store, { experimentId: e.id, day: '2026-11-10', rating: 4, note: 'better' });
    let rows = await listCheckins(store, e.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ day: '2026-11-10', rating: 4, note: 'better' });
    await saveCheckin(store, { experimentId: e.id, day: '2026-11-17', rating: 3, note: '' });
    rows = await listCheckins(store, e.id);
    expect(rows.map((r) => r.rating)).toEqual([4, 3]);
  });
});
