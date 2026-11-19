import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseRecord, Migration, Store } from '@mindwell/core';
import { isId } from '@mindwell/core';
import { createStore } from './store';
import { createBetterSqliteDriver } from './better-sqlite-driver';

interface Capture extends BaseRecord {
  body: string;
  day: string;
  score: number | null;
}

const TABLE = 'ch01_captures';

const CAPTURES_V1: Migration = {
  version: 1,
  sql: `CREATE TABLE ch01_captures (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    body TEXT NOT NULL,
    day TEXT NOT NULL,
    score INTEGER
  )`,
};

let driver: ReturnType<typeof createBetterSqliteDriver>;
let store: Store;

beforeEach(async () => {
  driver = createBetterSqliteDriver();
  store = createStore(driver);
  await store.migrate('ch01', [CAPTURES_V1]);
});

afterEach(() => {
  vi.useRealTimers();
  driver.close();
});

interface Seed {
  body: string;
  day: string;
  score?: number | null;
}

async function seedOne(r: Seed): Promise<Capture> {
  return store.insert<Capture>(TABLE, { body: r.body, day: r.day, score: r.score ?? null });
}

async function seed(rows: Seed[]): Promise<Capture[]> {
  const out: Capture[] = [];
  for (const r of rows) out.push(await seedOne(r));
  return out;
}

describe('Store.insert', () => {
  it('returns the full row with generated base columns', async () => {
    const row = await store.insert<Capture>(TABLE, { body: 'hello', day: '2026-05-10', score: 3 });
    expect(isId(row.id)).toBe(true);
    expect(row.body).toBe('hello');
    expect(row.day).toBe('2026-05-10');
    expect(row.score).toBe(3);
    expect(row.deleted_at).toBeNull();
    expect(row.schema_version).toBe(1);
    expect(row.created_at).toBe(row.updated_at);
    expect(new Date(row.created_at).toISOString()).toBe(row.created_at);
  });

  it('stores null for an explicit null field', async () => {
    const row = await store.insert<Capture>(TABLE, { body: 'x', day: '2026-05-10', score: null });
    expect(row.score).toBeNull();
  });

  it('honours schemaVersion', async () => {
    const row = await store.insert<Capture>(TABLE, { body: 'x', day: '2026-05-10', score: null }, {
      schemaVersion: 3,
    });
    expect(row.schema_version).toBe(3);
  });

  it('gives each row a distinct, increasing id', async () => {
    const a = await seedOne({ body: 'a', day: '2026-05-10' });
    const b = await seedOne({ body: 'b', day: '2026-05-10' });
    const c = await seedOne({ body: 'c', day: '2026-05-10' });
    expect(a.id).not.toBe(b.id);
    expect(b.id > a.id).toBe(true);
    expect(c.id > b.id).toBe(true);
  });

  it('rejects an invalid table identifier', async () => {
    await expect(
      store.insert(`${TABLE}; DROP TABLE ${TABLE}`, { body: 'x', day: '2026-05-10', score: null }),
    ).rejects.toThrow(/Invalid SQL identifier/);
  });

  it('rejects an invalid column identifier', async () => {
    await expect(
      store.insert(TABLE, { 'bad-col': 'x', body: 'x', day: '2026-05-10' } as never),
    ).rejects.toThrow(/Invalid SQL identifier/);
  });
});

describe('Store.get', () => {
  it('returns the row by id', async () => {
    const row = await seedOne({ body: 'a', day: '2026-05-10' });
    expect(await store.get<Capture>(TABLE, row.id)).toEqual(row);
  });

  it('returns null for a missing id', async () => {
    expect(await store.get<Capture>(TABLE, 'does-not-exist')).toBeNull();
  });

  it('returns null for a soft-deleted row by default', async () => {
    const row = await seedOne({ body: 'a', day: '2026-05-10' });
    await store.softDelete(TABLE, row.id);
    expect(await store.get<Capture>(TABLE, row.id)).toBeNull();
  });

  it('returns a soft-deleted row when includeDeleted is true', async () => {
    const row = await seedOne({ body: 'a', day: '2026-05-10' });
    await store.softDelete(TABLE, row.id);
    const found = await store.get<Capture>(TABLE, row.id, { includeDeleted: true });
    expect(found).not.toBeNull();
    expect(found?.deleted_at).not.toBeNull();
  });
});

describe('Store.update', () => {
  it('applies the patch and returns the updated row', async () => {
    const row = await seedOne({ body: 'old', day: '2026-05-10', score: 1 });
    const updated = await store.update<Capture>(TABLE, row.id, { body: 'new' });
    expect(updated.body).toBe('new');
    expect(updated.score).toBe(1);
    expect(updated.day).toBe('2026-05-10');
    expect(await store.get<Capture>(TABLE, row.id)).toEqual(updated);
  });

  it('bumps updated_at but keeps created_at', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-10T08:00:00.000Z'));
    const row = await seedOne({ body: 'a', day: '2026-05-10' });
    vi.setSystemTime(new Date('2026-05-10T09:00:00.000Z'));
    const updated = await store.update<Capture>(TABLE, row.id, { score: 5 });
    expect(updated.created_at).toBe('2026-05-10T08:00:00.000Z');
    expect(updated.updated_at).toBe('2026-05-10T09:00:00.000Z');
  });

  it('ignores attempts to change base columns', async () => {
    const row = await seedOne({ body: 'a', day: '2026-05-10' });
    const patch = {
      body: 'b',
      id: 'hijacked',
      created_at: '1999-01-01T00:00:00.000Z',
      deleted_at: '2000-01-01T00:00:00.000Z',
      schema_version: 9,
    } as Partial<Capture>;
    const updated = await store.update<Capture>(TABLE, row.id, patch);
    expect(updated.id).toBe(row.id);
    expect(updated.created_at).toBe(row.created_at);
    expect(updated.deleted_at).toBeNull();
    expect(updated.schema_version).toBe(1);
    expect(updated.body).toBe('b');
  });

  it('accepts an empty patch and still bumps updated_at', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-10T08:00:00.000Z'));
    const row = await seedOne({ body: 'a', day: '2026-05-10' });
    vi.setSystemTime(new Date('2026-05-10T08:30:00.000Z'));
    const updated = await store.update<Capture>(TABLE, row.id, {});
    expect(updated.body).toBe('a');
    expect(updated.updated_at).toBe('2026-05-10T08:30:00.000Z');
  });

  it('throws for a missing id', async () => {
    await expect(store.update<Capture>(TABLE, 'nope', { body: 'x' })).rejects.toThrow(/not found or deleted/);
  });

  it('throws for a soft-deleted row', async () => {
    const row = await seedOne({ body: 'a', day: '2026-05-10' });
    await store.softDelete(TABLE, row.id);
    await expect(store.update<Capture>(TABLE, row.id, { body: 'x' })).rejects.toThrow(/not found or deleted/);
  });
});

describe('Store.softDelete', () => {
  it('sets deleted_at and updated_at and keeps the row in the table', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-10T08:00:00.000Z'));
    const row = await seedOne({ body: 'a', day: '2026-05-10' });
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));
    await store.softDelete(TABLE, row.id);

    const raw = await store.get<Capture>(TABLE, row.id, { includeDeleted: true });
    expect(raw?.deleted_at).toBe('2026-05-10T10:00:00.000Z');
    expect(raw?.updated_at).toBe('2026-05-10T10:00:00.000Z');
    expect(raw?.body).toBe('a');
  });

  it('hides the row from list and get', async () => {
    const a = await seedOne({ body: 'a', day: '2026-05-10' });
    const b = await seedOne({ body: 'b', day: '2026-05-10' });
    await store.softDelete(TABLE, a.id);
    expect((await store.list<Capture>(TABLE)).map((r) => r.id)).toEqual([b.id]);
    expect(await store.get<Capture>(TABLE, a.id)).toBeNull();
  });

  it('keeps the original deleted_at when deleting twice', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));
    const row = await seedOne({ body: 'a', day: '2026-05-10' });
    await store.softDelete(TABLE, row.id);
    vi.setSystemTime(new Date('2026-05-11T10:00:00.000Z'));
    await store.softDelete(TABLE, row.id);
    const raw = await store.get<Capture>(TABLE, row.id, { includeDeleted: true });
    expect(raw?.deleted_at).toBe('2026-05-10T10:00:00.000Z');
  });

  it('does nothing for a missing id', async () => {
    await expect(store.softDelete(TABLE, 'nope')).resolves.toBeUndefined();
  });
});

describe('Store.list', () => {
  it('returns [] for an empty table', async () => {
    expect(await store.list<Capture>(TABLE)).toEqual([]);
  });

  it('returns [] when a where clause matches nothing', async () => {
    await seed([{ body: 'a', day: '2026-05-10' }]);
    expect(await store.list<Capture>(TABLE, { where: { day: '2030-01-01' } })).toEqual([]);
  });

  it('returns all live rows with no query', async () => {
    await seed([
      { body: 'a', day: '2026-05-10' },
      { body: 'b', day: '2026-05-11' },
    ]);
    expect(await store.list<Capture>(TABLE)).toHaveLength(2);
  });

  it('filters by equality on every where entry (AND)', async () => {
    await seed([
      { body: 'a', day: '2026-05-10', score: 1 },
      { body: 'b', day: '2026-05-10', score: 2 },
      { body: 'c', day: '2026-05-11', score: 1 },
    ]);
    const rows = await store.list<Capture>(TABLE, { where: { day: '2026-05-10', score: 1 } });
    expect(rows.map((r) => r.body)).toEqual(['a']);
  });

  it('matches null with IS NULL', async () => {
    await seed([
      { body: 'a', day: '2026-05-10', score: null },
      { body: 'b', day: '2026-05-10', score: 4 },
    ]);
    const rows = await store.list<Capture>(TABLE, { where: { score: null } });
    expect(rows.map((r) => r.body)).toEqual(['a']);
  });

  it('matches numeric zero by its stored value', async () => {
    await seed([
      { body: 'a', day: '2026-05-10', score: 0 },
      { body: 'b', day: '2026-05-10', score: 1 },
    ]);
    expect((await store.list<Capture>(TABLE, { where: { score: 0 } })).map((r) => r.body)).toEqual(['a']);
  });

  it('excludes soft-deleted rows by default and includes them with includeDeleted', async () => {
    const a = await seedOne({ body: 'a', day: '2026-05-10' });
    await seedOne({ body: 'b', day: '2026-05-10' });
    await store.softDelete(TABLE, a.id);
    expect(await store.list<Capture>(TABLE)).toHaveLength(1);
    expect(await store.list<Capture>(TABLE, { includeDeleted: true })).toHaveLength(2);
  });

  it('orders ascending and descending by a column', async () => {
    await seed([
      { body: 'b', day: '2026-05-11', score: 2 },
      { body: 'a', day: '2026-05-10', score: 1 },
      { body: 'c', day: '2026-05-12', score: 3 },
    ]);
    const asc = await store.list<Capture>(TABLE, { orderBy: { column: 'day' } });
    expect(asc.map((r) => r.body)).toEqual(['a', 'b', 'c']);
    const desc = await store.list<Capture>(TABLE, { orderBy: { column: 'day', direction: 'desc' } });
    expect(desc.map((r) => r.body)).toEqual(['c', 'b', 'a']);
  });

  it('supports multiple order-by columns', async () => {
    await seed([
      { body: 'x', day: '2026-05-10', score: 2 },
      { body: 'y', day: '2026-05-10', score: 1 },
      { body: 'z', day: '2026-05-09', score: 9 },
    ]);
    const rows = await store.list<Capture>(TABLE, {
      orderBy: [{ column: 'day' }, { column: 'score', direction: 'desc' }],
    });
    expect(rows.map((r) => r.body)).toEqual(['z', 'x', 'y']);
  });

  it('applies limit and offset', async () => {
    await seed([
      { body: 'a', day: '2026-05-10' },
      { body: 'b', day: '2026-05-11' },
      { body: 'c', day: '2026-05-12' },
      { body: 'd', day: '2026-05-13' },
    ]);
    const orderBy = { column: 'day' };
    expect((await store.list<Capture>(TABLE, { orderBy, limit: 2 })).map((r) => r.body)).toEqual(['a', 'b']);
    expect((await store.list<Capture>(TABLE, { orderBy, offset: 1 })).map((r) => r.body)).toEqual(['b', 'c', 'd']);
    expect(
      (await store.list<Capture>(TABLE, { orderBy, limit: 2, offset: 3 })).map((r) => r.body),
    ).toEqual(['d']);
  });

  it('returns [] when offset is past the end', async () => {
    await seed([{ body: 'a', day: '2026-05-10' }]);
    expect(await store.list<Capture>(TABLE, { offset: 5 })).toEqual([]);
  });

  it('limit 0 returns no rows', async () => {
    await seed([{ body: 'a', day: '2026-05-10' }]);
    expect(await store.list<Capture>(TABLE, { limit: 0 })).toEqual([]);
  });

  it('rejects an invalid identifier in where or orderBy', async () => {
    await expect(async () => store.list(TABLE, { where: { 'day; --': 'x' } })).rejects.toThrow(
      /Invalid SQL identifier/,
    );
    await expect(async () => store.list(TABLE, { orderBy: { column: 'day desc' } })).rejects.toThrow(
      /Invalid SQL identifier/,
    );
  });
});

describe('Store.migrate', () => {
  it('creates the table on first run and records the version', async () => {
    const tables = await driver.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ch01_captures'",
    );
    expect(tables).toHaveLength(1);
    const recorded = await driver.select<{ owner: string; version: number }>(
      'SELECT owner, version FROM _migrations',
    );
    expect(recorded).toEqual([{ owner: 'ch01', version: 1 }]);
  });

  it('is idempotent: running the same migrations again changes nothing', async () => {
    await seed([{ body: 'a', day: '2026-05-10' }]);
    await store.migrate('ch01', [CAPTURES_V1]);
    await store.migrate('ch01', [CAPTURES_V1]);
    const recorded = await driver.select<{ c: number }>('SELECT COUNT(*) AS c FROM _migrations');
    expect(recorded[0]?.c).toBe(1);
    // Existing data survives a re-run.
    expect(await store.list<Capture>(TABLE)).toHaveLength(1);
  });

  it('applies only the new migrations on a later call, in version order', async () => {
    const v2: Migration = {
      version: 2,
      sql: 'ALTER TABLE ch01_captures ADD COLUMN note TEXT',
    };
    const v3: Migration = {
      version: 3,
      sql: "UPDATE ch01_captures SET note = 'backfilled'",
    };
    // Given out of order on purpose.
    await store.migrate('ch01', [v3, CAPTURES_V1, v2]);
    const recorded = await driver.select<{ version: number }>(
      'SELECT version FROM _migrations WHERE owner = ? ORDER BY version',
      ['ch01'],
    );
    expect(recorded.map((r) => r.version)).toEqual([1, 2, 3]);
  });

  it('runs each migration once even when the list is re-supplied with new ones', async () => {
    await seed([{ body: 'a', day: '2026-05-10' }]);
    const v2: Migration = { version: 2, sql: 'ALTER TABLE ch01_captures ADD COLUMN note TEXT' };
    await store.migrate('ch01', [CAPTURES_V1, v2]);
    // Re-running v2 would fail with "duplicate column" if it were applied twice.
    await expect(store.migrate('ch01', [CAPTURES_V1, v2])).resolves.toBeUndefined();
  });

  it('keeps versions separate per owner', async () => {
    await store.migrate('ch02', [
      { version: 1, sql: 'CREATE TABLE ch02_thought_records (id TEXT PRIMARY KEY)' },
    ]);
    const recorded = await driver.select<{ owner: string; version: number }>(
      'SELECT owner, version FROM _migrations ORDER BY owner',
    );
    expect(recorded).toEqual([
      { owner: 'ch01', version: 1 },
      { owner: 'ch02', version: 1 },
    ]);
  });

  it('rolls back a failing migration and does not record it', async () => {
    const bad: Migration = {
      version: 2,
      sql: 'CREATE TABLE ch01_ok (id TEXT PRIMARY KEY); INSERT INTO no_such_table VALUES (1)',
    };
    await expect(store.migrate('ch01', [CAPTURES_V1, bad])).rejects.toThrow();
    const recorded = await driver.select<{ version: number }>(
      'SELECT version FROM _migrations WHERE owner = ?',
      ['ch01'],
    );
    expect(recorded.map((r) => r.version)).toEqual([1]);
    const tables = await driver.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ch01_ok'",
    );
    expect(tables).toEqual([]);
  });

  it('applies nothing when called with an empty list', async () => {
    await expect(store.migrate('ch05', [])).resolves.toBeUndefined();
    const recorded = await driver.select<{ c: number }>(
      "SELECT COUNT(*) AS c FROM _migrations WHERE owner = 'ch05'",
    );
    expect(recorded[0]?.c).toBe(0);
  });
});

describe('Store.transaction', () => {
  it('commits when the callback resolves', async () => {
    const result = await store.transaction(async (tx) => {
      await tx.insert<Capture>(TABLE, { body: 'a', day: '2026-05-10', score: null });
      await tx.insert<Capture>(TABLE, { body: 'b', day: '2026-05-10', score: null });
      return 'done';
    });
    expect(result).toBe('done');
    expect(await store.list<Capture>(TABLE)).toHaveLength(2);
  });

  it('rolls back everything when the callback throws', async () => {
    await expect(
      store.transaction(async (tx) => {
        await tx.insert<Capture>(TABLE, { body: 'a', day: '2026-05-10', score: null });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await store.list<Capture>(TABLE)).toEqual([]);
  });

  it('rolls back a nested transaction only, when the inner one throws', async () => {
    await store.transaction(async (tx) => {
      await tx.insert<Capture>(TABLE, { body: 'outer', day: '2026-05-10', score: null });
      await expect(
        tx.transaction(async (inner) => {
          await inner.insert<Capture>(TABLE, { body: 'inner', day: '2026-05-10', score: null });
          throw new Error('inner fails');
        }),
      ).rejects.toThrow('inner fails');
    });
    const rows = await store.list<Capture>(TABLE);
    expect(rows.map((r) => r.body)).toEqual(['outer']);
  });

  it('serializes operations started while a transaction is open', async () => {
    const order: string[] = [];
    const txPromise = store.transaction(async (tx) => {
      order.push('tx-start');
      await tx.insert<Capture>(TABLE, { body: 'a', day: '2026-05-10', score: null });
      order.push('tx-end');
    });
    const outside = store.list<Capture>(TABLE).then((rows) => {
      order.push(`list:${rows.length}`);
    });
    await Promise.all([txPromise, outside]);
    expect(order).toEqual(['tx-start', 'tx-end', 'list:1']);
  });
});
