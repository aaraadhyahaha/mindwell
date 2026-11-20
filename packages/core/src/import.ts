/**
 * Restore from a JSON export (see `export.ts`). Parsing and the summary are pure;
 * `restoreBackup` writes through the Store in one transaction.
 *
 * Restoring replaces the data without removing rows (hard rule 6): every backup row is
 * written verbatim by id, and every live row the backup doesn't contain is soft-deleted.
 * Column names, types and NOT NULL are checked by the tables themselves; a `dryRun`
 * does the whole restore and rolls it back, so a bad file is caught before the user confirms.
 */
import type { BaseRecord, SqlValue, Store } from './store';
import { EXPORT_FORMAT_VERSION } from './export';
import { isId } from './id';

/** A row as written to the Store: the shared columns plus plain SQL values. */
export type BackupRow = BaseRecord & Record<string, SqlValue>;

export interface Backup {
  format: number;
  exportedAt: string;
  tables: Record<string, BackupRow[]>;
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

export interface TableCount {
  table: string;
  live: number;
  deleted: number;
}

export interface BackupSummary {
  exportedAt: string;
  counts: TableCount[];
  /** Tables in the file that this app doesn't have. A backup with any is refused. */
  unknownTables: string[];
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isSqlValue = (v: unknown): v is SqlValue =>
  v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));

function rowError(row: unknown): string | null {
  if (!isObject(row)) return 'is not an object';
  if (typeof row['id'] !== 'string' || !isId(row['id'])) return 'has no valid id';
  for (const col of ['created_at', 'updated_at'] as const) {
    if (typeof row[col] !== 'string' || !ISO.test(row[col])) return `has an invalid ${col}`;
  }
  const del = row['deleted_at'];
  if (del !== null && (typeof del !== 'string' || !ISO.test(del))) return 'has an invalid deleted_at';
  const sv = row['schema_version'];
  if (typeof sv !== 'number' || !Number.isInteger(sv) || sv < 1) return 'has an invalid schema_version';
  for (const [k, v] of Object.entries(row)) {
    if (!IDENT.test(k)) return `has an invalid column name ${JSON.stringify(k)}`;
    if (!isSqlValue(v)) return `has a value in ${k} that isn't text, a number or empty`;
  }
  return null;
}

/** Parses and checks a JSON export: app, format, and the shared columns of every row. Pure. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  if (!isObject(data) || data['app'] !== 'mindwell') {
    return { ok: false, error: "This file isn't a mindwell JSON export." };
  }
  const format = data['format'];
  if (typeof format !== 'number' || !Number.isInteger(format) || format < 1) {
    return { ok: false, error: 'This export has no format version.' };
  }
  if (format > EXPORT_FORMAT_VERSION) {
    return { ok: false, error: 'This export comes from a newer version of mindwell. Update the app first.' };
  }
  const exportedAt = data['exported_at'];
  if (typeof exportedAt !== 'string' || !ISO.test(exportedAt)) {
    return { ok: false, error: 'This export has no valid export time.' };
  }
  const rawTables = data['tables'];
  if (!isObject(rawTables)) return { ok: false, error: 'This export has no tables.' };

  const tables: Record<string, BackupRow[]> = {};
  for (const [table, rows] of Object.entries(rawTables)) {
    if (!IDENT.test(table)) return { ok: false, error: `Invalid table name ${JSON.stringify(table)}.` };
    if (!Array.isArray(rows)) return { ok: false, error: `Table ${table} is not a list of records.` };
    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const err = rowError(rows[i]);
      if (err) return { ok: false, error: `Record ${i + 1} in ${table} ${err}.` };
      const id = (rows[i] as BackupRow).id;
      if (seen.has(id)) return { ok: false, error: `Table ${table} has the id ${id} twice.` };
      seen.add(id);
    }
    tables[table] = rows as BackupRow[];
  }
  return { ok: true, backup: { format, exportedAt, tables } };
}

/** Live and deleted counts per table, and tables this app doesn't know. Pure. */
export function backupSummary(backup: Backup, knownTables: readonly string[]): BackupSummary {
  const known = new Set(knownTables);
  const names = Object.keys(backup.tables).sort();
  return {
    exportedAt: backup.exportedAt,
    counts: names
      .filter((t) => known.has(t))
      .map((table) => {
        const rows = backup.tables[table] ?? [];
        const deleted = rows.filter((r) => r.deleted_at !== null).length;
        return { table, live: rows.length - deleted, deleted };
      }),
    unknownTables: names.filter((t) => !known.has(t)),
  };
}

class DryRunDone extends Error {}

/**
 * Replaces the Store's data with the backup's, atomically. Throws (and changes nothing)
 * if the backup has a table the Store doesn't, or a row its table rejects.
 * With `dryRun`, does everything and then rolls back.
 */
export async function restoreBackup(
  store: Store,
  backup: Backup,
  options: { dryRun?: boolean } = {},
): Promise<{ written: number; softDeleted: number }> {
  const known = await store.tables();
  const unknown = Object.keys(backup.tables).filter((t) => !known.includes(t));
  if (unknown.length > 0) throw new Error(`This app has no table ${unknown.join(', ')}.`);

  let result = { written: 0, softDeleted: 0 };
  try {
    await store.transaction(async (tx) => {
      let written = 0;
      let softDeleted = 0;
      for (const table of known) {
        const rows = backup.tables[table] ?? [];
        for (const row of rows) {
          try {
            await tx.put(table, row);
          } catch (err) {
            throw new Error(`A record in ${table} doesn't fit this app's table (${(err as Error).message}).`);
          }
          written++;
        }
        const keep = new Set(rows.map((r) => r.id));
        for (const live of await tx.list<BaseRecord>(table)) {
          if (!keep.has(live.id)) {
            await tx.softDelete(table, live.id);
            softDeleted++;
          }
        }
      }
      result = { written, softDeleted };
      if (options.dryRun) throw new DryRunDone();
    });
  } catch (err) {
    if (!(err instanceof DryRunDone)) throw err;
  }
  return result;
}
