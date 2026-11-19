import type { PromptDef, Signals } from '@mindwell/core';
import { signalNumber } from '@mindwell/core';
import { unchallengedStory } from './signals';

const lowYesterday = (s: Signals) => (signalNumber(s, 'yesterday.rating') ?? Infinity) <= 2;

export const prompts: PromptDef[] = [
  {
    id: 'ch02.intent.fair_judge',
    module: 'ch02',
    kind: 'intent',
    when: 'morning',
    technique: 'fair_judge',
    text: 'Be a fair judge of my thoughts today.',
    weight: 1,
    cooldownDays: 4,
    condition: (s) => lowYesterday(s) || unchallengedStory(s) !== undefined,
  },
  {
    id: 'ch02.evidence_against',
    module: 'ch02',
    kind: 'journal',
    when: 'morning',
    technique: 'thought_record',
    text: 'Write "{story}" word for word, then the strongest evidence against it.',
    weight: 1,
    cooldownDays: 5,
    condition: (s) => unchallengedStory(s) !== undefined,
    fill: (s) => {
      const u = unchallengedStory(s);
      return u ? { story: u.name } : null;
    },
  },
  {
    id: 'ch02.three_ps',
    module: 'ch02',
    kind: 'journal',
    when: 'evening',
    technique: 'three_ps',
    text: "Think of today's hardest moment. Was your explanation permanent, pervasive or personal? Rewrite it as temporary, specific and fair.",
    weight: 1,
    cooldownDays: 5,
    condition: (s) => (signalNumber(s, 'day.rating') ?? Infinity) <= 2,
  },
  {
    id: 'ch02.friend',
    module: 'ch02',
    kind: 'journal',
    when: 'anytime',
    technique: 'friend_view',
    text: 'What would you say to a friend who had the day you had yesterday?',
    weight: 1,
    cooldownDays: 6,
    condition: lowYesterday,
  },
];
