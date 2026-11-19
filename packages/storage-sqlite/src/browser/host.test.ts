import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseRecord, Migration, Store } from '@mindwell/core';
import { isId, newId } from '@mindwell/core';
import { createStore } from '../store';
import { createSqlHost } from './host';
import type { HostDb, SqlHost } from './host';
import { createRpcDriver } from './client';
import type { RpcDriver } from './client';
import type { SqlRequest } from './protocol';

interface Note extends BaseRecord {
  body: string;
  done: boolean;
}

const TABLE = 'ch01_notes';

const NOTES_V1: Migration = {
  version: 1,
  sql: `CREATE TABLE ch01_notes (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    body TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )`,
};

const TS = '2026-05-10T09:00:00.000Z';
const INSERT_RAW = `INSERT INTO ${TABLE} (id, created_at, updated_at, body, done) VALUES (?, ?, ?, ?, 0)`;
const SELECT_BODIES = `SELECT body FROM ${TABLE} ORDER BY rowid`;

/** better-sqlite3 as the synchronous HostDb the host expects. */
function hostDbOver(db: Database.Database): HostDb {
  return {
    run: (sql, params) => db.prepare(sql).run(...params).changes,
    all: (sql, params) => db.prepare(sql).all(...params),
  };
}

let db: Database.Database;
let host: SqlHost;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  host = createSqlHost(hostDbOver(db));
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

/** A client whose requests go straight to `host`; responses are fed back to it. */
function connect(sqlHost: SqlHost, id: string): RpcDriver {
  let driver!: RpcDriver;
  driver = createRpcDriver(id, (req) => void sqlHost.handle(req).then(driver.receive));
  return driver;
}

/** Migrates the notes table through a throwaway client. */
async function migrateSchema(): Promise<void> {
  await createStore(connect(host, 'setup')).migrate('ch01', [NOTES_V1]);
}

function rawInsert(d: RpcDriver, body: string) {
  return d.execute(INSERT_RAW, [newId(), TS, TS, body]);
}

async function bodies(d: RpcDriver): Promise<string[]> {
  return (await d.select<{ body: string }>(SELECT_BODIES)).map((r) => r.body);
}

/** Lets pending real-timer promise chains run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 3; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

describe('RPC client', () => {
  it('binds booleans as 0/1 and passes null and numbers through', async () => {
    const sent: SqlRequest[] = [];
    const c = createRpcDriver('A', (req) => sent.push(req));
    void c.execute('X', [true, false, null, 'a', 2]);
    expect(sent[0]!.params).toEqual([1, 0, null, 'a', 2]);
    expect(sent[0]!.client).toBe('A');
  });

  it('failPending rejects in-flight calls with the given message', async () => {
    const sent: SqlRequest[] = [];
    const c = createRpcDriver('A', (req) => sent.push(req));
    const p1 = c.execute('X').then(
      () => 'resolved',
      (e: Error) => e.message,
    );
    const p2 = c.select('Y').then(
      () => 'resolved',
      (e: Error) => e.message,
    );
    expect(sent).toHaveLength(2);
    c.failPending('connection lost');
    expect(await p1).toBe('connection lost');
    expect(await p2).toBe('connection lost');
  });

  it('ignores responses addressed to another client', async () => {
    const sent: SqlRequest[] = [];
    const c = createRpcDriver('A', (req) => sent.push(req));
    let settled = false;
    const p = c.execute('X').then(() => {
      settled = true;
    });
    const req = sent[0]!;
    c.receive({ client: 'B', id: req.id, ok: true, rowsAffected: 1, rows: [] });
    await flush();
    expect(settled).toBe(false);
    c.receive({ client: 'A', id: req.id, ok: true, rowsAffected: 1, rows: [] });
    await p;
    expect(settled).toBe(true);
  });

  it('ignores a response with an unknown id', async () => {
    const sent: SqlRequest[] = [];
    const c = createRpcDriver('A', (req) => sent.push(req));
    const p = c.execute('X');
    c.receive({ client: 'A', id: 999, ok: true, rowsAffected: 0, rows: [] });
    c.receive({ client: 'A', id: sent[0]!.id, ok: true, rowsAffected: 3, rows: [] });
    await expect(p).resolves.toEqual({ rowsAffected: 3 });
  });
});

describe('single client through Store', () => {
  it('migrates, round-trips insert, get, update, list and softDelete', async () => {
    const store = createStore(connect(host, 'A'));
    await store.migrate('ch01', [NOTES_V1]);
    await store.migrate('ch01', [NOTES_V1]); // second call is a no-op
    expect(await store.tables()).toContain(TABLE);

    const a = await store.insert<Note>(TABLE, { body: 'a', done: false });
    expect(isId(a.id)).toBe(true);
    expect(a.done).toBe(0); // boolean bound as 0
    expect(a.deleted_at).toBeNull();

    expect(await store.get<Note>(TABLE, a.id)).toEqual(a);

    const b = await store.insert<Note>(TABLE, { body: 'b', done: true });
    expect(b.done).toBe(1); // boolean bound as 1
    // booleans also bind as parameters in queries
    const doneRows = await store.list<Note>(TABLE, { where: { done: true } });
    expect(doneRows.map((r) => r.id)).toEqual([b.id]);

    const updated = await store.update<Note>(TABLE, a.id, { body: 'a2', done: true });
    expect(updated.body).toBe('a2');
    expect(updated.done).toBe(1);
    expect(updated.created_at).toBe(a.created_at);

    const all = await store.list<Note>(TABLE, { orderBy: { column: 'body' } });
    expect(all.map((r) => r.body)).toEqual(['a2', 'b']);

    await store.softDelete(TABLE, b.id);
    expect(await store.get<Note>(TABLE, b.id)).toBeNull();
    expect((await store.get<Note>(TABLE, b.id, { includeDeleted: true }))?.body).toBe('b');
    expect((await store.list<Note>(TABLE)).map((r) => r.body)).toEqual(['a2']);
  });

  it('rejects a bad statement with the SQLite message and keeps working afterwards', async () => {
    const driver = connect(host, 'A');
    const store = createStore(driver);
    await store.migrate('ch01', [NOTES_V1]);

    await expect(store.list('ch01_missing')).rejects.toThrow('no such table: ch01_missing');
    await expect(driver.select('SELEC 1')).rejects.toThrow(/syntax error/);
    await expect(driver.execute('INSERT INTO nope VALUES (1)')).rejects.toThrow('no such table: nope');

    const row = await store.insert<Note>(TABLE, { body: 'after', done: false });
    expect((await store.get<Note>(TABLE, row.id))?.body).toBe('after');
  });
});

describe('transactions through Store', () => {
  it('writes nothing when the callback throws', async () => {
    const store = createStore(connect(host, 'A'));
    await store.migrate('ch01', [NOTES_V1]);

    await expect(
      store.transaction(async (tx) => {
        await tx.insert(TABLE, { body: 'lost', done: false });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await store.list(TABLE)).toEqual([]);
    // the store is usable again and not stuck in a transaction
    await store.insert<Note>(TABLE, { body: 'kept', done: false });
    expect((await store.list<Note>(TABLE)).map((r) => r.body)).toEqual(['kept']);
  });

  it('rolls back only the inner savepoint when a nested transaction throws', async () => {
    const store = createStore(connect(host, 'A'));
    await store.migrate('ch01', [NOTES_V1]);

    await store.transaction(async (tx) => {
      await tx.insert(TABLE, { body: 'outer', done: false });
      await expect(
        tx.transaction(async (inner) => {
          await inner.insert(TABLE, { body: 'inner', done: false });
          throw new Error('inner failed');
        }),
      ).rejects.toThrow('inner failed');
    });

    expect((await store.list<Note>(TABLE)).map((r) => r.body)).toEqual(['outer']);
  });
});

describe('two clients sharing one host', () => {
  it('holds B until A commits, then B sees A rows', async () => {
    await migrateSchema();
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await rawInsert(A, 'a1');

    let bDone = false;
    const pending = B.select<{ body: string }>(SELECT_BODIES).then((r) => {
      bDone = true;
      return r;
    });
    await flush();
    expect(bDone).toBe(false);

    await A.execute('COMMIT');
    const rows = await pending;
    expect(bDone).toBe(true);
    expect(rows.map((r) => r.body)).toEqual(['a1']);
  });

  it('holds B until A rolls back, then B does not see A rows', async () => {
    await migrateSchema();
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await rawInsert(A, 'a1');

    let bDone = false;
    const pending = B.select<{ body: string }>(SELECT_BODIES).then((r) => {
      bDone = true;
      return r;
    });
    await flush();
    expect(bDone).toBe(false);

    await A.execute('ROLLBACK');
    expect((await pending).length).toBe(0);
    expect(bDone).toBe(true);
  });

  it('keeps the gate across SAVEPOINT, ROLLBACK TO and RELEASE', async () => {
    await migrateSchema();
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await A.execute('SAVEPOINT sp_1');
    await rawInsert(A, 'gone');
    await A.execute('ROLLBACK TO sp_1');
    await A.execute('RELEASE sp_1');

    let bDone = false;
    const pending = B.select<{ body: string }>(SELECT_BODIES).then((r) => {
      bDone = true;
      return r;
    });
    await flush();
    expect(bDone).toBe(false);

    await A.execute('SAVEPOINT sp_2');
    await A.execute('RELEASE sp_2');
    await flush();
    expect(bDone).toBe(false);

    await rawInsert(A, 'kept');
    await A.execute('COMMIT');
    expect((await pending).map((r) => r.body)).toEqual(['kept']);
  });

  it('keeps the gate after a rejected statement inside A transaction', async () => {
    await migrateSchema();
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await expect(A.execute('INSERT INTO nope VALUES (1)')).rejects.toThrow('no such table: nope');

    let bDone = false;
    const pending = B.select<{ body: string }>(SELECT_BODIES).then((r) => {
      bDone = true;
      return r;
    });
    await flush();
    expect(bDone).toBe(false);

    await A.execute('COMMIT');
    expect((await pending).length).toBe(0);
  });

  it('lets B insert after A commits', async () => {
    await migrateSchema();
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await rawInsert(A, 'a1');
    const pending = rawInsert(B, 'b1');
    await flush();
    await A.execute('COMMIT');
    expect((await pending).rowsAffected).toBe(1);
    expect(await bodies(A)).toEqual(['a1', 'b1']);
  });

  it('runs two Stores transactions concurrently without nesting errors', async () => {
    await migrateSchema();
    const sA = createStore(connect(host, 'A'));
    const sB = createStore(connect(host, 'B'));

    const work = (s: Store, tag: string) =>
      s.transaction(async (tx) => {
        for (const n of [1, 2, 3]) {
          await tx.insert(TABLE, { body: `${tag}${n}`, done: false });
          await flush();
        }
        return tag;
      });

    await expect(Promise.all([work(sA, 'a'), work(sB, 'b')])).resolves.toEqual(['a', 'b']);
    const rows = await sA.list<Note>(TABLE, { orderBy: { column: 'body' } });
    expect(rows.map((r) => r.body)).toEqual(['a1', 'a2', 'a3', 'b1', 'b2', 'b3']);
  });

  it('runs queued calls in arrival order after A ends', async () => {
    await migrateSchema();
    const A = connect(host, 'A');
    const B = connect(host, 'B');
    const C = connect(host, 'C');

    await A.execute('BEGIN');
    const calls = [
      rawInsert(B, 'b1'),
      rawInsert(C, 'c1'),
      B.select(SELECT_BODIES),
      rawInsert(C, 'c2'),
      rawInsert(B, 'b2'),
    ];
    await flush();
    await A.execute('COMMIT');
    await Promise.all(calls);
    expect(await bodies(A)).toEqual(['b1', 'c1', 'c2', 'b2']);
  });

  it('rolls back A and lets B proceed when A is dropped mid-transaction', async () => {
    await migrateSchema();
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await rawInsert(A, 'a1');
    const pending = rawInsert(B, 'b1');
    await flush();

    host.drop('A');
    expect((await pending).rowsAffected).toBe(1);
    expect(await bodies(B)).toEqual(['b1']);
  });

  it('fails the queued calls of a dropped client with "Client closed."', async () => {
    await migrateSchema();
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await rawInsert(A, 'a1');
    const queued = B.select(SELECT_BODIES).then(
      () => 'resolved',
      (e: Error) => e.message,
    );
    await flush();

    host.drop('B');
    expect(await queued).toBe('Client closed.');

    // A's transaction is untouched by B's drop
    await A.execute('COMMIT');
    expect(await bodies(A)).toEqual(['a1']);
  });
});

describe('idle timeout', () => {
  it('rolls back an idle transaction after exactly idleMs and lets B proceed', async () => {
    await migrateSchema();
    vi.useFakeTimers();
    host = createSqlHost(hostDbOver(db), { idleMs: 1000 });
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await rawInsert(A, 'a1');

    let bDone = false;
    const pending = B.select<{ body: string }>(SELECT_BODIES).then((r) => {
      bDone = true;
      return r;
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(bDone).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(bDone).toBe(true);
    expect(await pending).toEqual([]);
  });

  it('resets the timer on activity from the owner', async () => {
    await migrateSchema();
    vi.useFakeTimers();
    host = createSqlHost(hostDbOver(db), { idleMs: 1000 });
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await vi.advanceTimersByTimeAsync(900);
    await rawInsert(A, 'a1'); // timer restarts: fires at 900 + 1000

    let bDone = false;
    void B.select(SELECT_BODIES).then(() => {
      bDone = true;
    });

    await vi.advanceTimersByTimeAsync(900); // t = 1800
    expect(bDone).toBe(false);
    await vi.advanceTimersByTimeAsync(100); // t = 1900
    expect(bDone).toBe(true);
    expect(await bodies(B)).toEqual([]); // A's insert was rolled back
  });

  it('does not reset the timer on calls queued from other clients', async () => {
    await migrateSchema();
    vi.useFakeTimers();
    host = createSqlHost(hostDbOver(db), { idleMs: 1000 });
    const A = connect(host, 'A');
    const B = connect(host, 'B');

    await A.execute('BEGIN');
    await vi.advanceTimersByTimeAsync(500);
    let bDone = false;
    void B.select(SELECT_BODIES).then(() => {
      bDone = true;
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(bDone).toBe(false);
    await vi.advanceTimersByTimeAsync(1); // t = 1000, A idle since t = 0
    expect(bDone).toBe(true);
  });
});
