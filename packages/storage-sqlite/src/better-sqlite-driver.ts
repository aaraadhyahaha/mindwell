import Database from 'better-sqlite3';
import type { SqlDriver, SqlValue } from '@mindwell/core';

function bind(params: SqlValue[] = []): (string | number | null)[] {
  return params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

/** Test/Node SqlDriver over better-sqlite3. Defaults to an in-memory database. */
export function createBetterSqliteDriver(path = ':memory:'): SqlDriver & { close(): void } {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  return {
    async execute(sql, params) {
      const res = db.prepare(sql).run(...bind(params));
      return { rowsAffected: res.changes };
    },
    async select<T>(sql: string, params?: SqlValue[]) {
      return db.prepare(sql).all(...bind(params)) as T[];
    },
    close() {
      db.close();
    },
  };
}
