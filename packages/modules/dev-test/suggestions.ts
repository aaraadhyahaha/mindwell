import type { SuggestionRule } from '@mindwell/core';
import { signalNumber } from '@mindwell/core';

export const suggestions: SuggestionRule[] = [
  {
    id: 'dev.try_a_note',
    evaluate(signals) {
      const n = signalNumber(signals, 'dev.notes_today');
      if (n === undefined || n > 0) return null;
      return {
        key: 'dev.try_a_note',
        text: 'Add one dev note tomorrow evening.',
        reason: 'No dev notes today (test rule).',
      };
    },
  },
];
