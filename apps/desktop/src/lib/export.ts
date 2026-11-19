import { collectRecords, exportJson, exportMarkdown, localDay } from '@mindwell/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { getStore } from './db';

export type ExportFormat = 'md' | 'json';
export type ExportResult =
  | { status: 'saved'; path: string }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'error' };

const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const FILTERS: Record<ExportFormat, { name: string; extensions: string[] }> = {
  md: { name: 'Markdown', extensions: ['md'] },
  json: { name: 'JSON', extensions: ['json'] }
};

/** Asks where to save, then writes every record in the chosen format. */
export async function exportRecords(format: ExportFormat): Promise<ExportResult> {
  if (!inTauri()) return { status: 'unavailable' };
  try {
    const path = await save({
      defaultPath: `mindwell-${localDay(new Date())}.${format}`,
      filters: [FILTERS[format]]
    });
    if (!path) return { status: 'cancelled' };
    const dump = await collectRecords(await getStore());
    const at = new Date().toISOString();
    await writeTextFile(path, format === 'md' ? exportMarkdown(dump, at) : exportJson(dump, at));
    return { status: 'saved', path };
  } catch {
    return { status: 'error' };
  }
}
