/**
 * Local calendar days. A "day" is `YYYY-MM-DD` in the user's local time,
 * but it starts at 04:00, not midnight: an evening close at 01:00 still
 * belongs to the previous day.
 */

export const DAY_BOUNDARY_HOUR = 4;

const MS_PER_DAY = 86_400_000;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function formatDay(year: number, month: number, date: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(date, 2)}`;
}

/** The local day `at` belongs to, using the 04:00 boundary. Defaults to now. */
export function localDay(at: Date = new Date()): string {
  if (Number.isNaN(at.getTime())) throw new RangeError('localDay: invalid Date');
  const shift = at.getHours() < DAY_BOUNDARY_HOUR ? 1 : 0;
  // Calendar arithmetic in local time (not "minus 4 hours"), so DST changes don't matter.
  const d = new Date(at.getFullYear(), at.getMonth(), at.getDate() - shift);
  return formatDay(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** True for a real calendar date in `YYYY-MM-DD` form. */
export function isDay(value: string): boolean {
  return parseDayUtc(value) !== null;
}

/** `day` plus `n` days (n may be negative). */
export function addDays(day: string, n: number): string {
  if (!Number.isInteger(n)) throw new RangeError(`addDays: n must be an integer, got ${n}`);
  const d = new Date(requireDayUtc(day) + n * MS_PER_DAY);
  return formatDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((requireDayUtc(to) - requireDayUtc(from)) / MS_PER_DAY);
}

/** UTC midnight of the day in ms, or null if not a valid day. */
function parseDayUtc(value: string): number | null {
  const m = DAY_RE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return ms;
}

function requireDayUtc(day: string): number {
  const ms = parseDayUtc(day);
  if (ms === null) throw new RangeError(`Not a valid day (YYYY-MM-DD): ${day}`);
  return ms;
}
