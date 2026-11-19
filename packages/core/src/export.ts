/** Export of every record to JSON and Markdown. Formatting is pure; only `collectRecords` reads the Store. */
import type { BaseRecord, Store } from './store';

/** Bumped when the export file's shape changes. */
export const EXPORT_FORMAT_VERSION = 1;

/** Table name → every row, soft-deleted ones included. */
export type RecordDump = Readonly<Record<string, readonly BaseRecord[]>>;

/** Every row of every record table (soft-deleted included), rows in id order. */
export async function collectRecords(store: Store): Promise<Record<string, BaseRecord[]>> {
  const out: Record<string, BaseRecord[]> = {};
  for (const table of await store.tables()) {
    out[table] = await store.list<BaseRecord>(table, { includeDeleted: true, orderBy: { column: 'id' } });
  }
  return out;
}

/** Complete, machine-readable export: all rows including soft-deleted ones. Pure. */
export function exportJson(dump: RecordDump, exportedAt: string): string {
  const tables = Object.fromEntries(Object.keys(dump).sort().map((t) => [t, dump[t]]));
  return JSON.stringify({ app: 'mindwell', format: EXPORT_FORMAT_VERSION, exported_at: exportedAt, tables }, null, 2) + '\n';
}

const BASE_COLUMNS: ReadonlySet<string> = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'schema_version']);

function mdValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  // Multi-line text becomes an indented block under its bullet.
  return s.includes('\n') ? '\n' + s.split('\n').map((l) => `    ${l}`).join('\n') : s;
}

/**
 * Human-readable export: live rows only, one section per table, one entry per
 * row headed by its `day` (if any) and creation time. Shared columns other than
 * `created_at` are left out. Pure.
 */
export function exportMarkdown(dump: RecordDump, exportedAt: string): string {
  const lines: string[] = ['# mindwell export', '', `Exported ${exportedAt}. Deleted records are left out; the JSON export has everything.`];
  for (const table of Object.keys(dump).sort()) {
    const rows = (dump[table] ?? []).filter((r) => r.deleted_at === null);
    lines.push('', `## ${table} (${rows.length})`);
    if (rows.length === 0) {
      lines.push('', 'No records.');
      continue;
    }
    for (const row of rows) {
      const rec = row as unknown as Record<string, unknown>;
      const day = typeof rec['day'] === 'string' ? `${rec['day']} · ` : '';
      lines.push('', `### ${day}${row.created_at}`, '');
      for (const [k, v] of Object.entries(rec)) {
        if (BASE_COLUMNS.has(k)) continue;
        lines.push(`- **${k}:** ${mdValue(v)}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}
