import { collectRecords, exportJson, exportMarkdown, localDay } from '@mindwell/core';
import { getStore } from './db';
import { SETTING_KEYS, settings } from './settings.svelte';

export type ExportFormat = 'md' | 'json';
export type ExportResult = { status: 'saved'; filename: string } | { status: 'error' };

/** Builds every record in the chosen format and downloads it as a file. */
export async function exportRecords(format: ExportFormat): Promise<ExportResult> {
  try {
    const dump = await collectRecords(await getStore());
    const at = new Date().toISOString();
    const text = format === 'md' ? exportMarkdown(dump, at) : exportJson(dump, at);
    const type = format === 'md' ? 'text/markdown;charset=utf-8' : 'application/json';
    const filename = `mindwell-${localDay(new Date())}.${format}`;
    const url = URL.createObjectURL(new Blob([text], { type }));
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
    if (await settings.save(SETTING_KEYS.lastExportAt, at)) settings.lastExportAt = at;
    return { status: 'saved', filename };
  } catch {
    return { status: 'error' };
  }
}
