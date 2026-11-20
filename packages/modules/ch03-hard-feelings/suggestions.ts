import type { Signals, SuggestionRule } from '@mindwell/core';
import { addDays, signalList, signalObject } from '@mindwell/core';
import type { SeriesMood } from './signals';

/** Minimum rated events and helped share for `ch03.reframe_works`. */
export const REFRAME_MIN_EVENTS = 3;
export const REFRAME_MIN_RATE = 0.66;

const seriesMoods = (s: Signals): SeriesMood[] => signalList(s, 'ch03.series_moods') as unknown as SeriesMood[];

export const suggestions: SuggestionRule[] = [
  {
    id: 'ch03.reframe_works',
    evaluate(signals, { day }) {
      const c = signalObject(signals, 'ch03.reframe_counts');
      const k = typeof c?.helped === 'number' ? c.helped : 0;
      const n = typeof c?.rated === 'number' ? c.rated : 0;
      if (n < REFRAME_MIN_EVENTS || k / n < REFRAME_MIN_RATE) return null;
      return {
        key: `ch03.reframe_works:${n}:${day}`,
        text: `Reframing nerves as excitement helped in ${k} of ${n} events.`,
        reason: `${k} of ${n} rated events: the reframe helped (yes or a bit).`,
      };
    },
  },
  {
    id: 'ch03.series_mood',
    evaluate(signals, { day }) {
      const from = addDays(day, -6);
      const hit = seriesMoods(signals).find((m) => m.last_day >= from && m.last_day <= day && m.avg_after > m.avg_before);
      if (!hit) return null;
      return {
        key: `ch03.series_mood:${hit.id}`,
        text: `Your writing series on '${hit.topic}' left you calmer on average.`,
        reason: `Mood before averaged ${hit.avg_before}, after ${hit.avg_after}, over ${hit.n} sessions.`,
      };
    },
  },
];
