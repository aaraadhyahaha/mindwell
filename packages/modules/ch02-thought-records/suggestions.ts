import type { SuggestionRule } from '@mindwell/core';
import { storyTrend, unchallengedStory } from './signals';

/** A story counts as weakening when its last "after" is at least this far below its first "before". */
export const WEAKENING_DROP = 30;

export const suggestions: SuggestionRule[] = [
  {
    id: 'ch02.weakening',
    evaluate(signals, { day }) {
      for (const t of storyTrend(signals)) {
        if (t.n >= 3 && t.last_after <= t.first_before - WEAKENING_DROP) {
          return {
            key: `ch02.weakening:${t.story_id}:${day}`,
            text: `'${t.name}' went from ${t.first_before} to ${t.last_after} across ${t.n} records.`,
            reason: `First intensity before ${t.first_before}, latest after ${t.last_after}, over ${t.n} thought records.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'ch02.untested',
    evaluate(signals, { day }) {
      const u = unchallengedStory(signals);
      if (!u) return null;
      return {
        key: `ch02.untested:${u.id}:${day}`,
        text: `'${u.name}' keeps coming up but hasn't been tested. Do one record this week?`,
        reason: `3 or more captures in the last 7 days and no thought record in 14 days.`,
      };
    },
  },
];
