import { newId } from '@mindwell/core';
import type {
  BaseRecord,
  GetOptions,
  InsertOptions,
  Migration,
  NewRecord,
  OrderBy,
  Query,
  RecordPatch,
  SqlDriver,
  SqlValue,
  Store,
} from '@mindwell/core';

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Invalid SQL identifier: ${JSON.stringify(name)}`);
  return name;
}

function now(): string {
  return new Date().toISOString();
}

/** Naive split on `;` (migrations must not contain `;` inside strings or triggers). */
function statements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Runs tasks one at a time, in call order. */
type Serial = <R>(task: () => Promise<R>) => Promise<R>;

function serial(): Serial {
  let tail: Promise<unknown> = Promise.resolve();
  return <R>(task: () => Promise<R>): Promise<R> => {
    const run = tail.then(task);
    tail = run.catch(() => undefined);
    return run;
  };
}

/**
 * One SQL connection is shared, so every operation is serialized. A transaction
 * holds the queue until it ends and hands `fn` a child Store bound to it; inside
 * `fn`, use only that `tx` (calling the outer store there would wait forever).
 * Nested `tx.transaction` calls use SAVEPOINTs.
 */
export function createStore(driver: SqlDriver): Store {
  return build(driver, serial(), 0);
}

function build(driver: SqlDriver, run: Serial, depth: number): Store {
  async function getRow<T>(table: string, id: string, includeDeleted: boolean): Promise<T | null> {
    const rows = await driver.select<T>(
      `SELECT * FROM ${ident(table)} WHERE id = ?${includeDeleted ? '' : ' AND deleted_at IS NULL'}`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** Must be called from inside `run`. */
  async function inTransaction<R>(fn: (tx: Store) => Promise<R>): Promise<R> {
    const savepoint = depth > 0 ? `sp_${depth}` : null;
    await driver.execute(savepoint ? `SAVEPOINT ${savepoint}` : 'BEGIN');
    try {
      const result = await fn(build(driver, serial(), depth + 1));
      await driver.execute(savepoint ? `RELEASE ${savepoint}` : 'COMMIT');
      return result;
    } catch (err) {
      try {
        if (savepoint) {
          await driver.execute(`ROLLBACK TO ${savepoint}`);
          await driver.execute(`RELEASE ${savepoint}`);
        } else {
          await driver.execute('ROLLBACK');
        }
      } catch {
        // Keep the original error.
      }
      throw err;
    }
  }

  const store: Store = {
    async insert<T extends BaseRecord>(
      table: string,
      row: NewRecord<T>,
      options?: InsertOptions,
    ): Promise<T> {
      return run(async () => {
        const ts = now();
        const full: Record<string, SqlValue> = {
          ...(row as Record<string, SqlValue>),
          id: newId(),
          created_at: ts,
          updated_at: ts,
          deleted_at: null,
          schema_version: options?.schemaVersion ?? 1,
        };
        const cols = Object.keys(full).map(ident);
        await driver.execute(
          `INSERT INTO ${ident(table)} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          cols.map((c) => full[c] as SqlValue),
        );
        const saved = await getRow<T>(table, full.id as string, true);
        if (!saved) throw new Error(`Insert into ${table} failed`);
        return saved;
      });
    },

    update<T extends BaseRecord>(table: string, id: string, patch: RecordPatch<T>): Promise<T> {
      return run(async () => {
        const fields = { ...(patch as Record<string, SqlValue>) };
        for (const key of ['id', 'created_at', 'updated_at', 'deleted_at', 'schema_version']) {
          delete fields[key];
        }
        fields.updated_at = now();
        const cols = Object.keys(fields).map(ident);
        const res = await driver.execute(
          `UPDATE ${ident(table)} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND deleted_at IS NULL`,
          [...cols.map((c) => fields[c] as SqlValue), id],
        );
        if (res.rowsAffected === 0) throw new Error(`Cannot update ${table}/${id}: not found or deleted`);
        const saved = await getRow<T>(table, id, false);
        if (!saved) throw new Error(`Cannot update ${table}/${id}: not found or deleted`);
        return saved;
      });
    },

    softDelete(table: string, id: string): Promise<void> {
      const ts = now();
      return run(async () => {
        await driver.execute(
          `UPDATE ${ident(table)} SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
          [ts, ts, id],
        );
      });
    },

    get<T extends BaseRecord>(table: string, id: string, options?: GetOptions): Promise<T | null> {
      return run(() => getRow<T>(table, id, options?.includeDeleted ?? false));
    },

    list<T extends BaseRecord>(table: string, query: Query = {}): Promise<T[]> {
      return run(async () => {
        const clauses: string[] = [];
        const params: SqlValue[] = [];
        if (!query.includeDeleted) clauses.push('deleted_at IS NULL');
        for (const [col, value] of Object.entries(query.where ?? {})) {
          if (value === null) {
            clauses.push(`${ident(col)} IS NULL`);
          } else {
            clauses.push(`${ident(col)} = ?`);
            params.push(value);
          }
        }
        let sql = `SELECT * FROM ${ident(table)}`;
        if (clauses.length > 0) sql += ` WHERE ${clauses.join(' AND ')}`;
        const orders: OrderBy[] = query.orderBy === undefined ? [] : [query.orderBy].flat();
        if (orders.length > 0) {
          sql +=
            ' ORDER BY ' +
            orders.map((o) => `${ident(o.column)} ${o.direction === 'desc' ? 'DESC' : 'ASC'}`).join(', ');
        }
        if (query.limit !== undefined) {
          sql += ' LIMIT ?';
          params.push(Math.trunc(query.limit));
        } else if (query.offset !== undefined) {
          sql += ' LIMIT -1';
        }
        if (query.offset !== undefined) {
          sql += ' OFFSET ?';
          params.push(Math.trunc(query.offset));
        }
        return driver.select<T>(sql, params);
      });
    },

    migrate(owner: string, migrations: Migration[]): Promise<void> {
      return run(async () => {
        await driver.execute(
          `CREATE TABLE IF NOT EXISTS _migrations (
            owner TEXT NOT NULL,
            version INTEGER NOT NULL,
            applied_at TEXT NOT NULL,
            PRIMARY KEY (owner, version)
          )`,
        );
        const applied = await driver.select<{ version: number }>(
          'SELECT version FROM _migrations WHERE owner = ?',
          [owner],
        );
        const done = new Set(applied.map((r) => r.version));
        const pending = [...migrations].sort((a, b) => a.version - b.version).filter((m) => !done.has(m.version));
        for (const m of pending) {
          await inTransaction(async () => {
            for (const stmt of statements(m.sql)) await driver.execute(stmt);
            await driver.execute('INSERT INTO _migrations (owner, version, applied_at) VALUES (?, ?, ?)', [
              owner,
              m.version,
              now(),
            ]);
          });
        }
      });
    },

    transaction<R>(fn: (tx: Store) => Promise<R>): Promise<R> {
      return run(() => inTransaction(fn));
    },
  };
  return store;
}
