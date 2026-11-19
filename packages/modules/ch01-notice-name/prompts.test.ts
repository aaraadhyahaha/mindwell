import { describe, expect, it } from 'vitest';
import type { PromptDef, Signals } from '@mindwell/core';
import { renderPrompt } from '@mindwell/core';
import { prompts } from './prompts';

const byId = (id: string): PromptDef => {
  const p = prompts.find((x) => x.id === id);
  if (!p) throw new Error(`no prompt ${id}`);
  return p;
};
const intent = byId('ch01.intent.notice');
const origin = byId('ch01.top_story_origin');
const quiet = byId('ch01.quiet_day');

const topStory = (name: string, count: number) => ({ id: 'x', name, count });

describe('ch01.intent.notice condition', () => {
  it('is true at exactly 3 captures yesterday', () => {
    expect(intent.condition({ 'ch01.captures_yesterday': 3 })).toBe(true);
  });

  it('is false at 2 captures yesterday', () => {
    expect(intent.condition({ 'ch01.captures_yesterday': 2 })).toBe(false);
  });

  it('is false when the signal is missing or null', () => {
    expect(intent.condition({})).toBe(false);
    expect(intent.condition({ 'ch01.captures_yesterday': null })).toBe(false);
  });
});

describe('ch01.top_story_origin condition', () => {
  it('is true at exactly 3 captures for the top story', () => {
    expect(origin.condition({ 'ch01.top_story_7d': topStory('money worries', 3) })).toBe(true);
  });

  it('is false at 2 captures', () => {
    expect(origin.condition({ 'ch01.top_story_7d': topStory('money worries', 2) })).toBe(false);
  });

  it('is false when the signal is missing or null', () => {
    expect(origin.condition({})).toBe(false);
    expect(origin.condition({ 'ch01.top_story_7d': null })).toBe(false);
  });
});

describe('ch01.quiet_day condition', () => {
  const types = (...t: string[]): Signals => ({ 'day.types': t });

  it('is true for stressful_event', () => {
    expect(quiet.condition(types('stressful_event'))).toBe(true);
  });

  it('is true for exam', () => {
    expect(quiet.condition(types('exam'))).toBe(true);
  });

  it('is true when one of several types matches', () => {
    expect(quiet.condition(types('social', 'exam'))).toBe(true);
  });

  it('is false for other day types', () => {
    expect(quiet.condition(types('ordinary', 'social'))).toBe(false);
  });

  it('is false for an empty list, a missing signal, or a non-array value', () => {
    expect(quiet.condition(types())).toBe(false);
    expect(quiet.condition({})).toBe(false);
    expect(quiet.condition({ 'day.types': 'exam' })).toBe(false);
  });
});

describe('ch01.top_story_origin fill', () => {
  it('fills {story} with the top story name', () => {
    expect(origin.fill!({ 'ch01.top_story_7d': topStory('money worries', 3) })).toEqual({ story: 'money worries' });
  });

  it('returns null when there is no top story or its name is empty', () => {
    expect(origin.fill!({})).toBeNull();
    expect(origin.fill!({ 'ch01.top_story_7d': null })).toBeNull();
    expect(origin.fill!({ 'ch01.top_story_7d': topStory('', 3) })).toBeNull();
  });

  it('renders the story into the text through renderPrompt', () => {
    const text = renderPrompt(origin, { 'ch01.top_story_7d': topStory('money worries', 3) });
    expect(text).toBe(
      '"money worries" showed up most this week. When did that thought first start appearing in your life?',
    );
  });

  it('renderPrompt returns null when the story cannot be filled', () => {
    expect(renderPrompt(origin, {})).toBeNull();
  });
});

describe('renderPrompt on prompts without placeholders', () => {
  it('returns the text unchanged for the intent prompt', () => {
    expect(renderPrompt(intent, {})).toBe(intent.text);
  });

  it('returns the text unchanged for the quiet day prompt', () => {
    expect(renderPrompt(quiet, {})).toBe(quiet.text);
  });
});

describe('prompt metadata', () => {
  it('uses the expected when, kind, cooldown and weight', () => {
    expect(intent).toMatchObject({ kind: 'intent', when: 'morning', cooldownDays: 3, weight: 1 });
    expect(origin).toMatchObject({ kind: 'journal', when: 'morning', cooldownDays: 7, weight: 1 });
    expect(quiet).toMatchObject({ kind: 'journal', when: 'evening', cooldownDays: 3, weight: 1 });
  });
});
