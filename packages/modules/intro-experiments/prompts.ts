import type { PromptDef, Signals } from '@mindwell/core';
import { signalList, signalNumber, signalString } from '@mindwell/core';

function firstDueLabel(s: Signals): string | undefined {
  const first = signalList(s, 'intro.verdict_due')[0];
  if (first === null || typeof first !== 'object' || Array.isArray(first)) return undefined;
  const label = (first as { label?: unknown }).label;
  return typeof label === 'string' && label ? label : undefined;
}

export const prompts: PromptDef[] = [
  {
    id: 'intro.verdict_reflect',
    module: 'intro',
    kind: 'journal',
    when: 'evening',
    technique: 'experiment',
    text: "What did {technique} change for you, and what didn't it?",
    weight: 1,
    cooldownDays: 2,
    condition: (s) => (signalNumber(s, 'intro.awaiting_verdict') ?? 0) > 0 && firstDueLabel(s) !== undefined,
    fill: (s) => {
      const label = firstDueLabel(s);
      return label ? { technique: label } : null;
    },
  },
  {
    id: 'intro.mid_check',
    module: 'intro',
    kind: 'journal',
    when: 'morning',
    technique: 'experiment',
    text: 'Halfway through trying {technique}: what are you noticing so far?',
    weight: 1,
    cooldownDays: 7,
    condition: (s) => signalString(s, 'intro.midpoint_today') !== undefined,
    fill: (s) => {
      const label = signalString(s, 'intro.midpoint_today');
      return label ? { technique: label } : null;
    },
  },
];
