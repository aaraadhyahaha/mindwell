// The database worker: the official SQLite WASM build on the opfs-sahpool VFS (OPFS sync
// access handles; no COOP/COEP headers needed). Only the leader tab runs one. It serves every
// tab through `createSqlHost`, which keeps one tab's transaction from interleaving with another's.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { createSqlHost } from './host';
import type { SqlHost } from './host';
import type { FromWorker, ToWorker } from './protocol';

// Typed narrowly so this file checks under the DOM lib (the webworker lib conflicts with it).
const scope = self as unknown as {
  postMessage(msg: FromWorker): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
};

const DB_FILE = '/mindwell.db';

const post = (msg: FromWorker) => scope.postMessage(msg);

let host: SqlHost | null = null;
const early: ToWorker[] = [];

function dispatch(msg: ToWorker) {
  if (!host) {
    early.push(msg);
    return;
  }
  if (msg.type === 'drop') host.drop(msg.client);
  else void host.handle(msg.req).then((res) => post({ type: 'sql', res }));
}

scope.onmessage = (e: MessageEvent<ToWorker>) => dispatch(e.data);

async function open() {
  const sqlite3 = await sqlite3InitModule();
  let pool;
  try {
    // A previous leader's worker may still hold the access handles for a moment;
    // the main thread retries with a fresh worker when this reports `busy`.
    pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'mindwell', preserveOnInitFailure: true });
  } catch (err) {
    post({ type: 'fatal', error: err instanceof Error ? err.message : String(err), busy: true });
    return;
  }
  const db = new pool.OpfsSAHPoolDb(DB_FILE);
  db.exec('PRAGMA foreign_keys = ON');
  host = createSqlHost({
    run(sql, params) {
      // Total-changes delta: exact for DML, 0 for DDL and transaction control.
      const before = Number(db.changes(true));
      db.exec({ sql, bind: params.length ? params : undefined });
      return Number(db.changes(true)) - before;
    },
    all(sql, params) {
      return db.exec({
        sql,
        bind: params.length ? params : undefined,
        rowMode: 'object',
        returnValue: 'resultRows',
      });
    },
  });
  post({ type: 'ready' });
  for (const msg of early.splice(0)) dispatch(msg);
}

open().catch((err: unknown) => {
  post({ type: 'fatal', error: err instanceof Error ? err.message : String(err), busy: false });
});
