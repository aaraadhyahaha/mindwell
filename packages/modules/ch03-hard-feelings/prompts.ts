import type { PromptDef, Signals } from '@mindwell/core';
import { signalIncludes, signalNumber, signalObject } from '@mindwell/core';
import { daysSinceGratitude, eventToday, seriesActive } from './signals';

/** ch01's repeating story (5+ of the last 7 days), if ch01 is active. */
const repeatingStory = (s: Signals): string | null => {
  const name = signalObject(s, 'ch01.repeating_story')?.name;
  return typeof name === 'string' ? name : null;
};

const stressfulDay = (s: Signals) => signalIncludes(s, 'day.types', 'exam') || signalIncludes(s, 'day.types', 'stressful_event');

/** Gratitude: the condition keeps it to every 4+ days without a done mark. */
export const GRATITUDE_GAP_DAYS = 4;

export const prompts: PromptDef[] = [
  {
    id: 'ch03.intent.excited',
    module: 'ch03',
    kind: 'intent',
    when: 'morning',
    technique: 'reappraisal',
    text: 'When the nerves come today, call it excitement: my body is getting ready.',
    weight: 1,
    cooldownDays: 1,
    condition: (s) => eventToday(s) !== null || stressfulDay(s),
  },
  {
    id: 'ch03.defuse_story',
    module: 'ch03',
    kind: 'journal',
    when: 'morning',
    technique: 'defusion',
    text: 'Write "I\'m having the thought that {story}" five times. Notice how it feels by the fifth.',
    weight: 1,
    cooldownDays: 7,
    condition: (s) => repeatingStory(s) !== null,
    fill: (s) => {
      const story = repeatingStory(s);
      return story ? { story } : null;
    },
  },
  {
    id: 'ch03.offer_series',
    module: 'ch03',
    kind: 'journal',
    when: 'morning',
    technique: 'expressive',
    text: '"{story}" has been with you most days this week. Consider a 3-day writing series on it.',
    weight: 1,
    cooldownDays: 14,
    condition: (s) => repeatingStory(s) !== null && seriesActive(s) === null,
    fill: (s) => {
      const story = repeatingStory(s);
      return story ? { story } : null;
    },
  },
  {
    id: 'ch03.gratitude',
    module: 'ch03',
    kind: 'journal',
    when: 'evening',
    technique: 'gratitude',
    text: 'Three things that went well today, and why each one happened.',
    weight: 1,
    // Spec says 3; 4 is what keeps it to at most twice in any 7 days when it is shown but not marked done.
    cooldownDays: 4,
    condition: (s) => daysSinceGratitude(s) >= GRATITUDE_GAP_DAYS && (signalNumber(s, 'day.rating') ?? -Infinity) >= 3,
  },
];
