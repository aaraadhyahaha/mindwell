export const BACKUP_INTERVAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when the newest of since / last export / dismissal is at least a week old. */
export function backupDue(
  now: Date,
  s: { since: string | null; lastExportAt: string | null; dismissedAt: string | null }
): boolean {
  const times = [s.since, s.lastExportAt, s.dismissedAt]
    .filter((v): v is string => v !== null)
    .map((v) => Date.parse(v))
    .filter((t) => !Number.isNaN(t));
  if (times.length === 0) return false;
  return now.getTime() - Math.max(...times) >= BACKUP_INTERVAL_DAYS * DAY_MS;
}
