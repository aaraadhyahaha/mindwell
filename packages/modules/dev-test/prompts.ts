import type { PromptDef } from '@mindwell/core';

export const prompts: PromptDef[] = [
  {
    id: 'dev.intent.test',
    module: 'dev',
    kind: 'intent',
    when: 'morning',
    technique: 'dev_intent',
    text: 'Test intent: finish one small task before lunch.',
    weight: 1,
    cooldownDays: 0,
    condition: (s) => typeof s['day.energy'] === 'number' && s['day.energy'] >= 4,
  },
  {
    id: 'dev.journal.test',
    module: 'dev',
    kind: 'journal',
    when: 'anytime',
    technique: 'dev_journal',
    text: 'Test prompt: what are you building today?',
    weight: 1,
    cooldownDays: 1,
    condition: () => true,
  },
];
