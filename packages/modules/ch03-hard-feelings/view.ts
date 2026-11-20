import { addDays } from '@mindwell/core';
import type { ReframeHelped, StressEvent } from './schema';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Today", "Yesterday", "Tomorrow", else "Thursday, 19 November". Pure. */
export function dayLabel(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  if (day === addDays(today, 1)) return 'Tomorrow';
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${d} ${MONTHS[m - 1]}`;
}

export const TABS = [
  { id: 'defuse', label: 'Defuse' },
  { id: 'events', label: 'Events' },
  { id: 'writing', label: 'Writing' },
  { id: 'gratitude', label: 'Gratitude' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

/** `?tab=<id>` from a location search string; Defuse when absent or unknown. Pure. */
export function tabFromSearch(search: string): TabId {
  const t = new URLSearchParams(search).get('tab');
  return TABS.some((x) => x.id === t) ? (t as TabId) : 'defuse';
}

/** Local `YYYY-MM-DD` + `HH:MM` → ISO timestamp, or null if either is malformed. Pure. */
export function toStartsAt(date: string, time: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const at = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** ISO timestamp → local `{ date: YYYY-MM-DD, time: HH:MM }` for inputs. Pure. */
export function fromStartsAt(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
}

/** Upcoming (not started, soonest first) and past (started, newest first). Pure. */
export function splitEvents<T extends Pick<StressEvent, 'starts_at'>>(events: readonly T[], now: string): { upcoming: T[]; past: T[] } {
  const t = Date.parse(now);
  const sorted = [...events].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  return {
    upcoming: sorted.filter((e) => Date.parse(e.starts_at) > t),
    past: sorted.filter((e) => Date.parse(e.starts_at) <= t).reverse(),
  };
}

export const HELPED_LABELS: Record<ReframeHelped, string> = { yes: 'Helped', a_bit: 'Helped a bit', no: "Didn't help" };
export const HELPED_OPTIONS: { value: ReframeHelped; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'a_bit', label: 'A bit' },
  { value: 'no', label: 'No' },
];
