import type { Backup, BackupSummary } from '@mindwell/core';
import { backupSummary, parseBackup, restoreBackup } from '@mindwell/core';
import { getStore } from './db';

export type ImportCheck =
  | { status: 'ready'; backup: Backup; summary: BackupSummary }
  | { status: 'error'; message: string };

/** Reads a JSON export and checks it fully (a rolled-back restore), without changing anything. */
export async function checkBackupFile(file: File): Promise<ImportCheck> {
  try {
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) return { status: 'error', message: parsed.error };
    const store = await getStore();
    const summary = backupSummary(parsed.backup, await store.tables());
    if (summary.unknownTables.length > 0) {
      return {
        status: 'error',
        message: `This backup has records this version of mindwell doesn't know (${summary.unknownTables.join(', ')}). Update the app first.`,
      };
    }
    await restoreBackup(store, parsed.backup, { dryRun: true });
    return { status: 'ready', backup: parsed.backup, summary };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Could not read this file.' };
  }
}

/** Replaces this browser's data with the backup's. The caller reloads the page afterwards. */
export async function restoreFromBackup(backup: Backup): Promise<{ status: 'done' } | { status: 'error'; message: string }> {
  try {
    await restoreBackup(await getStore(), backup);
    return { status: 'done' };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Could not restore. Nothing was changed.' };
  }
}
