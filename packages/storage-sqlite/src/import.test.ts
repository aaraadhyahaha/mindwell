import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BaseRecord, DayRecord, Migration, Store } from '@mindwell/core';
import { CORE_TABLES, collectRecords, coreMigrations, exportJson, newId, parseBackup, restoreBackup, backupSummary } from '@mindwell/core';
import type { Backup, BackupRow } from '@mindwell/core';
import { createStore } from './store';
import { createBetterSqliteDriver } from './better-sqlite-driver';

// A small record table with the shared columns plus a NOT NULL and a nullable value column.
const T = 't';
const testMigrations: Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE t (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      schema_version INTEGER NOT NULL,
      label TEXT NOT NULL,
      n INTEGER
    )`,
  },
];

const AT = '2026-11-19T10:00:00.000Z';

type Driver = ReturnType<typeof createBetterSqliteDriver>;
const drivers: Driver[] = [];

async function freshStore(): Promise<Store> {
  const driver = createBetterSqliteDriver();
  drivers.push(driver);
  const store = createStore(driver);
  await store.migrate('core', coreMigrations);
  await store.migrate('t', testMigrations);
  return store;
}

afterEach(() => {
  for (const d of drivers.splice(0)) d.close();
});

const dayRow = (day: string) => ({
  day,
  types: '[]',
  energy: null,
  intent_prompt_id: null,
  intent_text: null,
  intent_result: null,
  rating: null,
  checkin_at: null,
  closed_at: null,
});

/** Writes a row with fixed timestamps, as a restore would. */
function fixed(id: string, label: string, n: number | null, extra: Partial<BaseRecord> = {}): BaseRecord & Record<string, unknown> {
  return {
    id,
    created_at: '2026-11-01T08:00:00.000Z',
    updated_at: '2026-11-02T08:00:00.000Z',
    deleted_at: null,
    schema_version: 1,
    label,
    n,
    ...extra,
  } as BaseRecord & Record<string, unknown>;
}

/** Seeds a store with a mix of live, soft-deleted and timestamp-controlled rows. */
async function seed(store: Store): Promise<void> {
  await store.put(T, fixed('01AAAAAAAAAAAAAAAAAAAAAAAA', 'alpha', 5, { schema_version: 2 }));
  await store.put(T, fixed('01BBBBBBBBBBBBBBBBBBBBBBBB', 'beta', null));
  await store.put(T, fixed('01CCCCCCCCCCCCCCCCCCCCCCCC', 'gamma', 7, { deleted_at: '2026-11-05T09:00:00.000Z' }));
  await store.insert<DayRecord>(CORE_TABLES.days, dayRow('2026-11-18'));
  const dead = await store.insert<DayRecord>(CORE_TABLES.days, dayRow('2026-11-17'));
  await store.softDelete(CORE_TABLES.days, dead.id);
}

/** Converts a dump to a Backup the way parseBackup does, via the JSON text. */
function toBackup(text: string): Backup {
  const res = parseBackup(text);
  if (!res.ok) throw new Error(res.error);
  return res.backup;
}

async function snapshot(store: Store): Promise<Record<string, BaseRecord[]>> {
  return collectRecords(store);
}

describe('round trip through JSON', () => {
  it('restores a fresh store to exactly the original dump', async () => {
    const original = await freshStore();
    await seed(original);
    const dump = await snapshot(original);
    const text = exportJson(dump, AT);

    const fresh = await freshStore();
    const result = await restoreBackup(fresh, toBackup(text));

    expect(await snapshot(fresh)).toEqual(dump);
    expect(result.softDeleted).toBe(0);
    const total = Object.values(dump).reduce((n, rows) => n + rows.length, 0);
    expect(result.written).toBe(total);
  });

  it('keeps soft-deleted rows, timestamps and schema_version', async () => {
    const original = await freshStore();
    await seed(original);
    const fresh = await freshStore();
    await restoreBackup(fresh, toBackup(exportJson(await snapshot(original), AT)));

    expect(await fresh.get(T, '01CCCCCCCCCCCCCCCCCCCCCCCC')).toBeNull();
    const gone = await fresh.get(T, '01CCCCCCCCCCCCCCCCCCCCCCCC', { includeDeleted: true });
    expect(gone).toMatchObject({ label: 'gamma', deleted_at: '2026-11-05T09:00:00.000Z', created_at: '2026-11-01T08:00:00.000Z' });
    const alpha = await fresh.get(T, '01AAAAAAAAAAAAAAAAAAAAAAAA');
    expect(alpha).toMatchObject({ label: 'alpha', n: 5, schema_version: 2, updated_at: '2026-11-02T08:00:00.000Z' });
  });

  it('restores the same backup twice to the same dump', async () => {
    const original = await freshStore();
    await seed(original);
    const dump = await snapshot(original);
    const backup = toBackup(exportJson(dump, AT));

    const fresh = await freshStore();
    await restoreBackup(fresh, backup);
    const once = await snapshot(fresh);
    const second = await restoreBackup(fresh, backup);

    expect(await snapshot(fresh)).toEqual(once);
    expect(once).toEqual(dump);
    expect(second.softDeleted).toBe(0);
  });
});

describe('restoreBackup into a store with data', () => {
  it('overwrites same-id rows, soft-deletes live rows missing from the backup, and counts them', async () => {
    const store = await freshStore();
    await store.put(T, fixed('01AAAAAAAAAAAAAAAAAAAAAAAA', 'alpha-old', 1));
    await store.put(T, fixed('01BBBBBBBBBBBBBBBBBBBBBBBB', 'beta', 2));
    await store.put(T, fixed('01CCCCCCCCCCCCCCCCCCCCCCCC', 'gamma', 3, { deleted_at: '2026-11-05T09:00:00.000Z' }));
    const day = await store.insert<DayRecord>(CORE_TABLES.days, dayRow('2026-11-18'));

    // The backup has no `days` table at all, so every live day is soft-deleted.
    const backup: Backup = {
      format: 1,
      exportedAt: AT,
      tables: {
        [T]: [
          fixed('01AAAAAAAAAAAAAAAAAAAAAAAA', 'alpha-new', 9, { created_at: '2026-10-01T00:00:00.000Z' }) as unknown as BackupRow,
          fixed('01DDDDDDDDDDDDDDDDDDDDDDDD', 'delta', null) as unknown as BackupRow,
          fixed('01CCCCCCCCCCCCCCCCCCCCCCCC', 'gamma', 3, { deleted_at: '2026-11-05T09:00:00.000Z' }) as unknown as BackupRow,
        ],
      },
    };

    const result = await restoreBackup(store, backup);
    expect(result).toEqual({ written: 3, softDeleted: 2 }); // beta (t) and the live day

    const alpha = await store.get(T, '01AAAAAAAAAAAAAAAAAAAAAAAA');
    expect(alpha).toMatchObject({ label: 'alpha-new', n: 9, created_at: '2026-10-01T00:00:00.000Z' });
    expect(await store.get(T, '01BBBBBBBBBBBBBBBBBBBBBBBB')).toBeNull();
    const beta = await store.get(T, '01BBBBBBBBBBBBBBBBBBBBBBBB', { includeDeleted: true });
    expect(beta?.deleted_at).not.toBeNull();
    expect(await store.get(T, '01DDDDDDDDDDDDDDDDDDDDDDDD')).toMatchObject({ label: 'delta' });
    expect(await store.get(T, '01CCCCCCCCCCCCCCCCCCCCCCCC', { includeDeleted: true })).toMatchObject({ label: 'gamma' });

    const gone = await store.get<DayRecord>(CORE_TABLES.days, day.id, { includeDeleted: true });
    expect(gone?.deleted_at).not.toBeNull();
    expect(await store.list<DayRecord>(CORE_TABLES.days)).toEqual([]);
  });

  it('soft-deletes every live row of a table absent from the backup', async () => {
    const store = await freshStore();
    await seed(store);
    const before = await snapshot(store);
    const liveDays = before[CORE_TABLES.days]!.filter((r) => r.deleted_at === null).length;
    const liveT = before[T]!.filter((r) => r.deleted_at === null).length;

    const result = await restoreBackup(store, { format: 1, exportedAt: AT, tables: {} });
    expect(result).toEqual({ written: 0, softDeleted: liveDays + liveT });
    expect((await store.list(T))).toEqual([]);
    expect((await store.list(CORE_TABLES.days))).toEqual([]);
    // Nothing is removed: the same ids are still there, all marked deleted.
    const after = await snapshot(store);
    for (const table of [T, CORE_TABLES.days]) {
      expect(after[table]!.map((r) => r.id)).toEqual(before[table]!.map((r) => r.id));
      expect(after[table]!.every((r) => r.deleted_at !== null)).toBe(true);
    }
  });

  it('writes nothing and reports the counts when dryRun is set', async () => {
    const store = await freshStore();
    await seed(store);
    const before = await snapshot(store);

    const backup: Backup = {
      format: 1,
      exportedAt: AT,
      tables: { [T]: [fixed('01EEEEEEEEEEEEEEEEEEEEEE', 'epsilon', 4) as unknown as BackupRow] },
    };
    const result = await restoreBackup(store, backup, { dryRun: true });

    expect(result).toEqual({ written: 1, softDeleted: 3 }); // live t rows alpha and beta, plus the live day
    expect(await snapshot(store)).toEqual(before);
  });

  it('dryRun counts match the real restore', async () => {
    const backup: Backup = {
      format: 1,
      exportedAt: AT,
      tables: { [T]: [fixed('01AAAAAAAAAAAAAAAAAAAAAAAA', 'x', 1) as unknown as BackupRow] },
    };
    const a = await freshStore();
    await seed(a);
    const b = await freshStore();
    await seed(b);
    expect(await restoreBackup(a, backup, { dryRun: true })).toEqual(await restoreBackup(b, backup));
  });
});

describe('restoreBackup failures', () => {
  it('throws and changes nothing when a row has an unknown column', async () => {
    const store = await freshStore();
    await seed(store);
    const before = await snapshot(store);

    const backup: Backup = {
      format: 1,
      exportedAt: AT,
      tables: {
        [T]: [
          fixed('01EEEEEEEEEEEEEEEEEEEEEE', 'epsilon', 4) as unknown as BackupRow,
          fixed('01FFFFFFFFFFFFFFFFFFFFFF', 'zeta', 4, { bogus: 'x' }) as unknown as BackupRow,
        ],
      },
    };
    await expect(restoreBackup(store, backup)).rejects.toThrow(/doesn't fit this app's table/);
    expect(await snapshot(store)).toEqual(before);
  });

  it('throws and changes nothing when a NOT NULL column is missing', async () => {
    const store = await freshStore();
    await seed(store);
    const before = await snapshot(store);

    const { label: _label, ...noLabel } = fixed('01EEEEEEEEEEEEEEEEEEEEEE', 'x', 1);
    const backup: Backup = {
      format: 1,
      exportedAt: AT,
      tables: { [CORE_TABLES.days]: [], [T]: [noLabel as unknown as BackupRow] },
    };
    // `days` is processed before `t`: its soft-deletes must roll back too.
    await expect(restoreBackup(store, backup)).rejects.toThrow(/doesn't fit this app's table/);
    expect(await snapshot(store)).toEqual(before);
  });

  it('throws before writing when the backup has a table the store lacks', async () => {
    const store = await freshStore();
    await seed(store);
    const before = await snapshot(store);

    const backup: Backup = {
      format: 1,
      exportedAt: AT,
      tables: {
        [T]: [fixed('01EEEEEEEEEEEEEEEEEEEEEE', 'epsilon', 4) as unknown as BackupRow],
        nope: [],
      },
    };
    await expect(restoreBackup(store, backup)).rejects.toThrow(/no table nope/);
    expect(await snapshot(store)).toEqual(before);
  });
});

describe('Store.put', () => {
  it('keeps the provided id, created_at, updated_at and schema_version', async () => {
    const store = await freshStore();
    const id = newId();
    await store.put(T, fixed(id, 'kept', 1, { schema_version: 3 }));
    expect(await store.get(T, id)).toEqual(fixed(id, 'kept', 1, { schema_version: 3 }));
  });

  it('overwrites an existing row with the same id, column by column', async () => {
    const store = await freshStore();
    const id = newId();
    await store.put(T, fixed(id, 'first', 1));
    await store.put(T, fixed(id, 'second', null, { deleted_at: '2026-11-09T00:00:00.000Z' }));
    expect(await store.get(T, id)).toBeNull();
    expect(await store.get(T, id, { includeDeleted: true })).toEqual(
      fixed(id, 'second', null, { deleted_at: '2026-11-09T00:00:00.000Z' }),
    );
    expect(await store.list(T, { includeDeleted: true })).toHaveLength(1);
  });

  it('keeps created_at and updated_at as written, not the current time', async () => {
    const store = await freshStore();
    const id = newId();
    await store.put(T, fixed(id, 'old', 1));
    const row = await store.get<BaseRecord>(T, id);
    expect(row?.created_at).toBe('2026-11-01T08:00:00.000Z');
    expect(row?.updated_at).toBe('2026-11-02T08:00:00.000Z');
  });
});

describe('backupSummary against a real export', () => {
  it('counts the rows of a store that was exported', async () => {
    const store = await freshStore();
    await seed(store);
    const parsed = toBackup(exportJson(await snapshot(store), AT));
    const summary = backupSummary(parsed, await store.tables());
    expect(summary.unknownTables).toEqual([]);
    expect(summary.counts).toContainEqual({ table: T, live: 2, deleted: 1 });
    expect(summary.counts).toContainEqual({ table: CORE_TABLES.days, live: 1, deleted: 1 });
  });
});
