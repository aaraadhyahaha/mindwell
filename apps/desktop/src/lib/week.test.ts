import { expect, it } from 'vitest';
import { weekRangeLabel } from './week';

it('formats a week range', () => {
  expect(weekRangeLabel('2026-11-13', '2026-11-19')).toBe('13–19 NOVEMBER');
  expect(weekRangeLabel('2026-10-28', '2026-11-03')).toBe('28 OCTOBER – 3 NOVEMBER');
});
