const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

function parts(day: string): { d: number; m: string } {
  const [, mo, d] = day.split('-');
  return { d: Number(d), m: MONTHS[Number(mo) - 1] ?? '' };
}

/** "13–19 NOVEMBER", or "28 OCTOBER – 3 NOVEMBER" across months. */
export function weekRangeLabel(first: string, last: string): string {
  const a = parts(first);
  const b = parts(last);
  return a.m === b.m ? `${a.d}–${b.d} ${b.m}` : `${a.d} ${a.m} – ${b.d} ${b.m}`;
}
