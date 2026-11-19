import type { PromptDef, Signals } from '@mindwell/core';
import { signalIncludes, signalNumber, signalObject } from '@mindwell/core';

function topStory(s: Signals): { name: string; count: number } | undefined {
  const o = signalObject(s, 'ch01.top_story_7d');
  if (!o || typeof o.name !== 'string' || !o.name || typeof o.count !== 'number') return undefined;
  return { name: o.name, count: o.count };
}

export const prompts: PromptDef[] = [
  {
    id: 'ch01.intent.notice',
    module: 'ch01',
    kind: 'intent',
    when: 'morning',
    technique: 'notice',
    text: 'Today, notice and name thoughts instead of arguing with them.',
    weight: 1,
    cooldownDays: 3,
    condition: (s) => (signalNumber(s, 'ch01.captures_yesterday') ?? 0) >= 3,
  },
  {
    id: 'ch01.top_story_origin',
    module: 'ch01',
    kind: 'journal',
    when: 'morning',
    technique: 'story_reflect',
    text: '"{story}" showed up most this week. When did that thought first start appearing in your life?',
    weight: 1,
    cooldownDays: 7,
    condition: (s) => (topStory(s)?.count ?? 0) >= 3,
    fill: (s) => {
      const t = topStory(s);
      return t ? { story: t.name } : null;
    },
  },
  {
    id: 'ch01.quiet_day',
    module: 'ch01',
    kind: 'journal',
    when: 'evening',
    technique: 'notice',
    text: "Which thoughts came up today that you didn't capture? Name them now.",
    weight: 1,
    cooldownDays: 3,
    condition: (s) => signalIncludes(s, 'day.types', 'stressful_event') || signalIncludes(s, 'day.types', 'exam'),
  },
];
