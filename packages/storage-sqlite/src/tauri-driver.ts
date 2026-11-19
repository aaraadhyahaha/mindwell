import Database from '@tauri-apps/plugin-sql';
import type { SqlDriver, SqlValue } from '@mindwell/core';

function bind(params: SqlValue[] = []): SqlValue[] {
  return params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

/** SqlDriver over tauri-plugin-sql. `path` like `sqlite:mindwell.db`. */
export async function createTauriDriver(path: string): Promise<SqlDriver> {
  const db = await Database.load(path);
  return {
    async execute(sql, params) {
      const res = await db.execute(sql, bind(params));
      return { rowsAffected: res.rowsAffected };
    },
    select<T>(sql: string, params?: SqlValue[]) {
      return db.select<T[]>(sql, bind(params));
    },
  };
}
