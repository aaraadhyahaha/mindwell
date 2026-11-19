import { describe, expect, it } from 'vitest';
import type { BaseRecord } from './store';
import { EXPORT_FORMAT_VERSION, exportJson, exportMarkdown } from './export';

const base = (id: string, extra: Record<string, unknown> = {}, deleted: string | null = null): BaseRecord =>
  ({
    id,
    created_at: '2026-11-19T08:00:00.000Z',
    updated_at: '2026-11-19T08:00:00.000Z',
    deleted_at: deleted,
    schema_version: 1,
    ...extra,
  }) as unknown as BaseRecord;

const AT = '2026-11-19T10:00:00.000Z';

describe('exportJson', () => {
  it('produces valid JSON with format, exported_at and tables', () => {
    const text = exportJson({ days: [base('a', { day: '2026-11-19' })] }, AT);
    const parsed = JSON.parse(text);
    expect(parsed.app).toBe('mindwell');
    expect(parsed.format).toBe(EXPORT_FORMAT_VERSION);
    expect(parsed.exported_at).toBe(AT);
    expect(parsed.tables.days).toHaveLength(1);
    expect(parsed.tables.days[0]).toMatchObject({ id: 'a', day: '2026-11-19' });
    expect(text.endsWith('\n')).toBe(true);
  });

  it('sorts table names', () => {
    const text = exportJson({ zeta: [], alpha: [], mid: [] }, AT);
    expect(Object.keys(JSON.parse(text).tables)).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('keeps soft-deleted rows', () => {
    const text = exportJson({ days: [base('a', {}, '2026-11-19T11:00:00.000Z')] }, AT);
    const rows = JSON.parse(text).tables.days;
    expect(rows).toHaveLength(1);
    expect(rows[0].deleted_at).toBe('2026-11-19T11:00:00.000Z');
  });

  it('handles an empty dump', () => {
    const parsed = JSON.parse(exportJson({}, AT));
    expect(parsed.tables).toEqual({});
  });
});

describe('exportMarkdown', () => {
  it('leaves out deleted rows and counts only live ones', () => {
    const md = exportMarkdown(
      { notes: [base('a', { text: 'kept' }), base('b', { text: 'gone' }, '2026-11-19T11:00:00.000Z')] },
      AT,
    );
    expect(md).toContain('## notes (1)');
    expect(md).toContain('kept');
    expect(md).not.toContain('gone');
  });

  it('shows "No records." for an empty table', () => {
    const md = exportMarkdown({ notes: [] }, AT);
    expect(md).toContain('## notes (0)');
    expect(md).toContain('No records.');
  });

  it('shows "No records." when every row is deleted', () => {
    const md = exportMarkdown({ notes: [base('a', {}, '2026-11-19T11:00:00.000Z')] }, AT);
    expect(md).toContain('## notes (0)');
    expect(md).toContain('No records.');
  });

  it('does not print base columns other than created_at', () => {
    const md = exportMarkdown({ notes: [base('ULIDID', { text: 'x' })] }, AT);
    expect(md).toContain('### 2026-11-19T08:00:00.000Z');
    expect(md).not.toContain('ULIDID');
    expect(md).not.toContain('updated_at');
    expect(md).not.toContain('schema_version');
    expect(md).not.toContain('deleted_at');
  });

  it('puts the day in the heading when there is a day column', () => {
    const md = exportMarkdown({ days: [base('a', { day: '2026-11-18' })] }, AT);
    expect(md).toContain('### 2026-11-18 · 2026-11-19T08:00:00.000Z');
  });

  it('indents multi-line strings under their bullet', () => {
    const md = exportMarkdown({ notes: [base('a', { body: 'line one\nline two' })] }, AT);
    expect(md).toContain('- **body:** \n    line one\n    line two');
  });

  it('shows null as an em dash', () => {
    const md = exportMarkdown({ days: [base('a', { day: '2026-11-19', rating: null })] }, AT);
    expect(md).toContain('- **rating:** —');
  });

  it('serialises non-string values as JSON', () => {
    const md = exportMarkdown({ days: [base('a', { day: '2026-11-19', rating: 4, types: '["exam"]' })] }, AT);
    expect(md).toContain('- **rating:** 4');
  });

  it('starts with a title and the export time', () => {
    const md = exportMarkdown({}, AT);
    expect(md.startsWith('# mindwell export')).toBe(true);
    expect(md).toContain(AT);
  });
});
