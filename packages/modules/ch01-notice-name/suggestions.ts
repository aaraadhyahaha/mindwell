import type { SignalValue, SuggestionRule } from '@mindwell/core';
import { signalList, signalNumber } from '@mindwell/core';

type Obj = { readonly [k: string]: SignalValue };
const isObj = (v: SignalValue): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

export const suggestions: SuggestionRule[] = [
  {
    id: 'ch01.unlinked',
    evaluate(signals, { day }) {
      const n = signalNumber(signals, 'ch01.unlinked_7d');
      if (n === undefined || n < 5) return null;
      return {
        key: `ch01.unlinked:${day}`,
        text: `${n} captures aren't linked to a story yet. Name the pattern?`,
        reason: `${n} thoughts captured in the last 7 days have no story.`,
      };
    },
  },
  {
    id: 'ch01.fading',
    evaluate(signals, { day }) {
      for (const s of signalList(signals, 'ch01.story_fortnights')) {
        if (!isObj(s)) continue;
        const { id, name, current, previous } = s;
        if (typeof id !== 'string' || typeof name !== 'string' || typeof current !== 'number' || typeof previous !== 'number') continue;
        if (previous >= 4 && current <= previous / 2) {
          return {
            key: `ch01.fading:${id}:${day}`,
            text: `'${name}' showed up half as often this fortnight.`,
            reason: `${current} captures in the last 14 days, against ${previous} in the 14 before.`,
          };
        }
      }
      return null;
    },
  },
];
