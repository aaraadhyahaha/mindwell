import type { PromptDef } from './prompts';
import { CORE_SIGNALS, signalIncludes, signalNumber } from './signals';

export const FALLBACK_INTENT_ID = 'core.intent.default';
export const FALLBACK_JOURNAL_ID = 'core.journal.default';

/** Core prompts (PROMPTS.md). The two defaults are fallback-only, never regular candidates. */
export const corePrompts: readonly PromptDef[] = [
  {
    id: FALLBACK_INTENT_ID,
    module: 'core',
    kind: 'intent',
    when: 'morning',
    technique: 'core.intent',
    text: "What's one thing that would make today count?",
    weight: 1,
    cooldownDays: 0,
    condition: () => true,
  },
  {
    id: 'core.intent.light_day',
    module: 'core',
    kind: 'intent',
    when: 'morning',
    technique: 'core.rest',
    text: "It's a lighter day. What would rest well look like?",
    weight: 1,
    cooldownDays: 0,
    condition: (s) => signalIncludes(s, CORE_SIGNALS.dayTypes, 'light'),
  },
  {
    id: FALLBACK_JOURNAL_ID,
    module: 'core',
    kind: 'journal',
    when: 'morning',
    technique: 'core.open',
    text: "What's on your mind as the day starts?",
    weight: 1,
    cooldownDays: 0,
    condition: () => true,
  },
  {
    id: 'core.journal.hard_yesterday',
    module: 'core',
    kind: 'journal',
    when: 'morning',
    technique: 'core.review_yesterday',
    text: "Yesterday was hard. What made it hard, and what's one thing you'd do differently?",
    weight: 1,
    cooldownDays: 3,
    condition: (s) => {
      const r = signalNumber(s, CORE_SIGNALS.yesterdayRating);
      return r !== undefined && r <= 2;
    },
  },
  {
    id: 'core.evening.surprise',
    module: 'core',
    kind: 'journal',
    when: 'evening',
    technique: 'core.expectation',
    text: 'What went differently from what you expected today?',
    weight: 1,
    cooldownDays: 4,
    condition: () => true,
  },
];
