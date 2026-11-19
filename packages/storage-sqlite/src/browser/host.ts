import type { BoundValue, SqlRequest, SqlResponse } from './protocol';

/** The one real connection, synchronous (sqlite-wasm oo1 in the worker; better-sqlite3 in tests). */
export interface HostDb {
  /** Runs a statement; returns the number of rows changed. */
  run(sql: string, params: BoundValue[]): number;
  /** Runs a query; returns rows as plain objects. */
  all(sql: string, params: BoundValue[]): unknown[];
}

export interface SqlHost {
  handle(req: SqlRequest): Promise<SqlResponse>;
  /** A client went away: roll back its open transaction and fail its queued calls. */
  drop(client: string): void;
}

export interface HostOptions {
  /** A transaction with no call from its owner for this long is rolled back. Default 10 s. */
  idleMs?: number;
}

const BEGIN = /^\s*BEGIN\b/i;
// COMMIT / END / ROLLBACK end the transaction; `ROLLBACK TO <savepoint>` does not.
const END = /^\s*(COMMIT|END|ROLLBACK(?!\s+(TRANSACTION\s+)?TO\b))\b/i;

interface Waiting {
  req: SqlRequest;
  resolve: (res: SqlResponse) => void;
}

/**
 * Serves several tabs from one connection. Each tab's Store runs a transaction as
 * separate calls (BEGIN … COMMIT), so while one client has a transaction open, every
 * other client's calls wait until it ends. Calls run in arrival order otherwise.
 */
export function createSqlHost(db: HostDb, opts: HostOptions = {}): SqlHost {
  const idleMs = opts.idleMs ?? 10_000;
  let owner: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const queue: Waiting[] = [];

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function armTimer() {
    clearTimer();
    const held = owner;
    timer = setTimeout(() => {
      if (owner === held) abandon();
    }, idleMs);
  }

  /** Rolls back the owner's transaction and lets the others in. */
  function abandon() {
    clearTimer();
    try {
      db.run('ROLLBACK', []);
    } catch {
      // already rolled back
    }
    owner = null;
    drain();
  }

  function exec(req: SqlRequest): SqlResponse {
    const { client, id } = req;
    try {
      if (req.op === 'select') {
        return { client, id, ok: true, rowsAffected: 0, rows: db.all(req.sql, req.params) };
      }
      const rowsAffected = db.run(req.sql, req.params);
      return { client, id, ok: true, rowsAffected, rows: [] };
    } catch (err) {
      return { client, id, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /** Runs one call that is allowed now and tracks transaction ownership. */
  function run(req: SqlRequest): SqlResponse {
    const res = exec(req);
    if (req.op === 'execute') {
      if (BEGIN.test(req.sql) && res.ok) owner = req.client;
      else if (END.test(req.sql) && owner === req.client) owner = null;
    }
    if (owner === null) clearTimer();
    else armTimer();
    return res;
  }

  /** Runs queued calls in order until one must wait for a transaction it doesn't own. */
  function drain() {
    let i = 0;
    while (i < queue.length) {
      const w = queue[i]!;
      if (owner !== null && w.req.client !== owner) {
        i++;
        continue;
      }
      queue.splice(i, 1);
      w.resolve(run(w.req));
      i = 0; // ownership may have changed; restart from the oldest waiter
    }
  }

  return {
    handle(req) {
      if (owner !== null && req.client !== owner) {
        return new Promise((resolve) => queue.push({ req, resolve }));
      }
      const res = run(req);
      if (owner === null) drain();
      return Promise.resolve(res);
    },
    drop(client) {
      for (let i = queue.length - 1; i >= 0; i--) {
        const w = queue[i]!;
        if (w.req.client !== client) continue;
        queue.splice(i, 1);
        w.resolve({ client, id: w.req.id, ok: false, error: 'Client closed.' });
      }
      if (owner === client) abandon();
    },
  };
}
