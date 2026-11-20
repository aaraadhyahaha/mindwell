import { describe, expect, it } from 'vitest';
import { backupSummary, parseBackup, type Backup, type BackupRow } from './import';
import { EXPORT_FORMAT_VERSION, exportJson } from './export';
import type { BaseRecord } from './store';
import { newId } from './id';

const AT = '2026-11-19T10:00:00.000Z';
const TS = '2026-11-19T08:00:00.000Z';

function row(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: newId(),
    created_at: TS,
    updated_at: TS,
    deleted_at: null,
    schema_version: 1,
    ...extra,
  };
}

/** A complete export file as an object, so tests can break one field at a time. */
function file(tables: Record<string, unknown> = { days: [row({ day: '2026-11-19' })] }): Record<string, unknown> {
  return { app: 'mindwell', format: EXPORT_FORMAT_VERSION, exported_at: AT, tables };
}

function text(obj: unknown): string {
  return JSON.stringify(obj);
}

function expectRejected(input: string, message?: RegExp): void {
  const res = parseBackup(input);
  expect(res.ok).toBe(false);
  if (!res.ok && message) expect(res.error).toMatch(message);
}

describe('parseBackup', () => {
  it('accepts the output of exportJson and returns the same rows', () => {
    const a = row({ day: '2026-11-18', energy: 3, flag: true, note: null });
    const b = row({ day: '2026-11-19', deleted_at: '2026-11-19T09:00:00.000Z' });
    const dump = { days: [a, b] as unknown as BaseRecord[], notes: [] as BaseRecord[] };
    const res = parseBackup(exportJson(dump, AT));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.backup.format).toBe(EXPORT_FORMAT_VERSION);
    expect(res.backup.exportedAt).toBe(AT);
    expect(res.backup.tables['days']).toEqual([a, b]);
    expect(res.backup.tables['notes']).toEqual([]);
  });

  it('accepts a file with no tables and an empty table list', () => {
    expect(parseBackup(text(file({}))).ok).toBe(true);
    expect(parseBackup(text(file({ days: [] }))).ok).toBe(true);
  });

  it('accepts fractional seconds in exported_at', () => {
    const obj = { ...file(), exported_at: '2026-11-19T10:00:00.123Z' };
    expect(parseBackup(text(obj)).ok).toBe(true);
  });

  it('accepts format versions at or below the current one', () => {
    expect(parseBackup(text({ ...file(), format: 1 })).ok).toBe(true);
    expect(parseBackup(text({ ...file(), format: EXPORT_FORMAT_VERSION })).ok).toBe(true);
  });

  it('rejects invalid JSON', () => {
    expectRejected('{not json', /isn't valid JSON/);
    expectRejected('', /isn't valid JSON/);
  });

  it('rejects JSON that is not a mindwell export', () => {
    expectRejected('null', /isn't a mindwell JSON export/);
    expectRejected('[]', /isn't a mindwell JSON export/);
    expectRejected('"mindwell"', /isn't a mindwell JSON export/);
    expectRejected(text({ ...file(), app: 'other' }), /isn't a mindwell JSON export/);
    const { app: _app, ...noApp } = file();
    expectRejected(text(noApp), /isn't a mindwell JSON export/);
  });

  it('rejects a missing, non-integer, zero or negative format', () => {
    const { format: _f, ...noFormat } = file();
    expectRejected(text(noFormat), /no format version/);
    expectRejected(text({ ...file(), format: '1' }), /no format version/);
    expectRejected(text({ ...file(), format: 1.5 }), /no format version/);
    expectRejected(text({ ...file(), format: 0 }), /no format version/);
    expectRejected(text({ ...file(), format: -1 }), /no format version/);
  });

  it('rejects a format newer than this app supports', () => {
    expectRejected(text({ ...file(), format: EXPORT_FORMAT_VERSION + 1 }), /newer version of mindwell/);
  });

  it('rejects a missing or malformed exported_at', () => {
    const { exported_at: _e, ...noAt } = file();
    expectRejected(text(noAt), /no valid export time/);
    expectRejected(text({ ...file(), exported_at: '2026-11-19' }), /no valid export time/);
    expectRejected(text({ ...file(), exported_at: '2026-11-19T10:00:00' }), /no valid export time/); // no Z
    expectRejected(text({ ...file(), exported_at: 'yesterday' }), /no valid export time/);
    expectRejected(text({ ...file(), exported_at: 1700000000000 }), /no valid export time/);
  });

  it('rejects tables that are missing, null, an array or a scalar', () => {
    const { tables: _t, ...noTables } = file();
    expectRejected(text(noTables), /no tables/);
    expectRejected(text({ ...file(), tables: null }), /no tables/);
    expectRejected(text({ ...file(), tables: [] }), /no tables/);
    expectRejected(text({ ...file(), tables: 'days' }), /no tables/);
  });

  it('rejects a table whose value is not a list', () => {
    expectRejected(text(file({ days: {} })), /Table days is not a list/);
    expectRejected(text(file({ days: row() })), /Table days is not a list/);
    expectRejected(text(file({ days: null })), /Table days is not a list/);
  });

  it('rejects a bad table name', () => {
    for (const name of ['1days', 'my-table', 'a b', 'drop;--', '', 'täbelle']) {
      expectRejected(text(file({ [name]: [] })), /Invalid table name/);
    }
  });

  it('accepts underscore-led and mixed-case table names', () => {
    expect(parseBackup(text(file({ _private: [], Mixed_Case9: [] }))).ok).toBe(true);
  });

  it('rejects a row that is not an object', () => {
    expectRejected(text(file({ days: ['abc'] })), /Record 1 in days is not an object/);
    expectRejected(text(file({ days: [null] })), /is not an object/);
    expectRejected(text(file({ days: [[]] })), /is not an object/);
  });

  it('reports the 1-based position of the bad record', () => {
    expectRejected(text(file({ days: [row(), row(), { ...row(), id: 'nope' }] })), /Record 3 in days/);
  });

  it('rejects a row with a missing or non-ULID id', () => {
    const { id: _id, ...noId } = row();
    expectRejected(text(file({ days: [noId] })), /has no valid id/);
    expectRejected(text(file({ days: [row({ id: 'short' })] })), /has no valid id/);
    expectRejected(text(file({ days: [row({ id: 'a'.repeat(26).replace('a', 'I') })] })), /has no valid id/); // I is not Crockford
    expectRejected(text(file({ days: [row({ id: 42 })] })), /has no valid id/);
    expectRejected(text(file({ days: [row({ id: null })] })), /has no valid id/);
  });

  it('rejects a bad created_at or updated_at', () => {
    for (const col of ['created_at', 'updated_at']) {
      const { [col]: _removed, ...missing } = row();
      expectRejected(text(file({ days: [missing] })), new RegExp(`invalid ${col}`));
      expectRejected(text(file({ days: [row({ [col]: '2026-11-19' })] })), new RegExp(`invalid ${col}`));
      expectRejected(text(file({ days: [row({ [col]: '2026-11-19T08:00:00' })] })), new RegExp(`invalid ${col}`));
      expectRejected(text(file({ days: [row({ [col]: 1700000000000 })] })), new RegExp(`invalid ${col}`));
    }
  });

  it('rejects a bad deleted_at, but accepts null and a timestamp', () => {
    const { deleted_at: _d, ...missing } = row();
    expectRejected(text(file({ days: [missing] })), /invalid deleted_at/);
    expectRejected(text(file({ days: [row({ deleted_at: '' })] })), /invalid deleted_at/);
    expectRejected(text(file({ days: [row({ deleted_at: 'gone' })] })), /invalid deleted_at/);
    expectRejected(text(file({ days: [row({ deleted_at: false })] })), /invalid deleted_at/);
    expect(parseBackup(text(file({ days: [row({ deleted_at: null })] }))).ok).toBe(true);
    expect(parseBackup(text(file({ days: [row({ deleted_at: TS })] }))).ok).toBe(true);
  });

  it('rejects schema_version 0, negative, non-integer or missing', () => {
    const { schema_version: _s, ...missing } = row();
    expectRejected(text(file({ days: [missing] })), /invalid schema_version/);
    expectRejected(text(file({ days: [row({ schema_version: 0 })] })), /invalid schema_version/);
    expectRejected(text(file({ days: [row({ schema_version: -1 })] })), /invalid schema_version/);
    expectRejected(text(file({ days: [row({ schema_version: 1.5 })] })), /invalid schema_version/);
    expectRejected(text(file({ days: [row({ schema_version: '1' })] })), /invalid schema_version/);
    expect(parseBackup(text(file({ days: [row({ schema_version: 2 })] }))).ok).toBe(true);
  });

  it('rejects a column whose value is a nested object or array', () => {
    expectRejected(text(file({ days: [row({ types: { a: 1 } })] })), /value in types/);
    expectRejected(text(file({ days: [row({ types: ['a'] })] })), /value in types/);
  });

  it('accepts null, string, number and boolean column values', () => {
    const r = row({ a: null, b: 'text', c: 3.5, d: true, e: false, f: 0 });
    expect(parseBackup(text(file({ days: [r] }))).ok).toBe(true);
  });

  it('rejects a column name that is not a plain identifier', () => {
    expectRejected(text(file({ days: [row({ 'bad-col': 1 })] })), /invalid column name "bad-col"/);
    expectRejected(text(file({ days: [row({ '1st': 1 })] })), /invalid column name/);
    expectRejected(text(file({ days: [row({ 'x y': 1 })] })), /invalid column name/);
  });

  it('rejects the same id twice within one table', () => {
    const r = row();
    expectRejected(text(file({ days: [r, { ...r, day: 'other' }] })), /has the id .* twice/);
  });

  it('allows the same id in different tables', () => {
    const r = row();
    expect(parseBackup(text(file({ days: [r], notes: [{ ...r }] }))).ok).toBe(true);
  });
});

function backupOf(tables: Record<string, BackupRow[]>): Backup {
  return { format: EXPORT_FORMAT_VERSION, exportedAt: AT, tables };
}

const bRow = (deleted: string | null = null): BackupRow =>
  ({ id: newId(), created_at: TS, updated_at: TS, deleted_at: deleted, schema_version: 1 }) as BackupRow;

describe('backupSummary', () => {
  it('counts live and deleted rows per known table, sorted by table name', () => {
    const backup = backupOf({
      notes: [bRow(), bRow(TS)],
      days: [bRow(), bRow(), bRow(TS)],
      chapters: [],
    });
    const s = backupSummary(backup, ['notes', 'days', 'chapters']);
    expect(s.exportedAt).toBe(AT);
    expect(s.counts).toEqual([
      { table: 'chapters', live: 0, deleted: 0 },
      { table: 'days', live: 2, deleted: 1 },
      { table: 'notes', live: 1, deleted: 1 },
    ]);
    expect(s.unknownTables).toEqual([]);
  });

  it('lists unknown tables separately and leaves them out of the counts', () => {
    const backup = backupOf({ zeta: [bRow()], days: [bRow()], alpha: [bRow(TS), bRow(TS)] });
    const s = backupSummary(backup, ['days']);
    expect(s.counts).toEqual([{ table: 'days', live: 1, deleted: 0 }]);
    expect(s.unknownTables).toEqual(['alpha', 'zeta']);
  });

  it('returns no counts for an empty backup', () => {
    expect(backupSummary(backupOf({}), ['days'])).toEqual({ exportedAt: AT, counts: [], unknownTables: [] });
  });

  it('omits known tables that the backup does not contain', () => {
    const s = backupSummary(backupOf({ days: [bRow()] }), ['days', 'notes']);
    expect(s.counts.map((c) => c.table)).toEqual(['days']);
  });

  it('treats an empty known-table list as all tables unknown', () => {
    const s = backupSummary(backupOf({ days: [bRow()] }), []);
    expect(s.counts).toEqual([]);
    expect(s.unknownTables).toEqual(['days']);
  });

  it('summarises a parsed export', () => {
    const r = row({ day: '2026-11-19' });
    const parsed = parseBackup(text(file({ days: [r, row({ deleted_at: TS })] })));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(backupSummary(parsed.backup, ['days'])).toEqual({
      exportedAt: AT,
      counts: [{ table: 'days', live: 1, deleted: 1 }],
      unknownTables: [],
    });
  });
});
