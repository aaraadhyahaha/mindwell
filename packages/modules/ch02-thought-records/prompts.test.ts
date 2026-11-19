import { describe, expect, it } from 'vitest';
import type { PromptDef, Signals } from '@mindwell/core';
import { prompts } from './prompts';

const byId = (id: string): PromptDef => {
  const p = prompts.find((x) => x.id === id);
  if (!p) throw new Error(`no prompt ${id}`);
  return p;
};
const fair = byId('ch02.intent.fair_judge');
const evidence = byId('ch02.evidence_against');
const threePs = byId('ch02.three_ps');
const friend = byId('ch02.friend');

const story = { id: 's1', name: 'money worries' };

describe('prompt table (ids, kinds, timing, cooldowns)', () => {
  it('matches the spec table', () => {
    expect(prompts.map((p) => [p.id, p.module, p.kind, p.when, p.technique, p.cooldownDays])).toEqual([
      ['ch02.intent.fair_judge', 'ch02', 'intent', 'morning', 'fair_judge', 4],
      ['ch02.evidence_against', 'ch02', 'journal', 'morning', 'thought_record', 5],
      ['ch02.three_ps', 'ch02', 'journal', 'evening', 'three_ps', 5],
      ['ch02.friend', 'ch02', 'journal', 'anytime', 'friend_view', 6],
    ]);
  });
});

describe('ch02.intent.fair_judge condition', () => {
  it('is true at yesterday.rating 2 and 1', () => {
    expect(fair.condition({ 'yesterday.rating': 2 })).toBe(true);
    expect(fair.condition({ 'yesterday.rating': 1 })).toBe(true);
  });

  it('is false at yesterday.rating 3', () => {
    expect(fair.condition({ 'yesterday.rating': 3 })).toBe(false);
  });

  it('is false when yesterday.rating is null or absent', () => {
    expect(fair.condition({ 'yesterday.rating': null })).toBe(false);
    expect(fair.condition({})).toBe(false);
  });

  it('is true when an unchallenged story is set, even with a good yesterday', () => {
    expect(fair.condition({ 'yesterday.rating': 5, 'ch02.unchallenged_story': story })).toBe(true);
  });

  it('is false when unchallenged_story is null (ch01 active, nothing unchallenged)', () => {
    expect(fair.condition({ 'ch02.unchallenged_story': null })).toBe(false);
  });

  it('is false when unchallenged_story is absent (ch01 inactive)', () => {
    expect(fair.condition({ 'yesterday.rating': 4 })).toBe(false);
  });
});

describe('ch02.evidence_against condition and fill', () => {
  it('is true when an unchallenged story is set', () => {
    expect(evidence.condition({ 'ch02.unchallenged_story': story })).toBe(true);
  });

  it('is false when unchallenged_story is null', () => {
    expect(evidence.condition({ 'ch02.unchallenged_story': null })).toBe(false);
  });

  it('is false when unchallenged_story is absent (ch01 inactive)', () => {
    expect(evidence.condition({})).toBe(false);
  });

  it('is not triggered by a low yesterday alone', () => {
    expect(evidence.condition({ 'yesterday.rating': 1 })).toBe(false);
  });

  it('fill returns {story: name}', () => {
    expect(evidence.fill!({ 'ch02.unchallenged_story': story })).toEqual({ story: 'money worries' });
  });

  it('fill returns null without an unchallenged story', () => {
    expect(evidence.fill!({ 'ch02.unchallenged_story': null })).toBeNull();
    expect(evidence.fill!({})).toBeNull();
  });
});

describe('ch02.three_ps condition', () => {
  it('is true at day.rating 2 and 1', () => {
    expect(threePs.condition({ 'day.rating': 2 })).toBe(true);
    expect(threePs.condition({ 'day.rating': 1 })).toBe(true);
  });

  it('is false at day.rating 3', () => {
    expect(threePs.condition({ 'day.rating': 3 })).toBe(false);
  });

  it('is false when day.rating is null or absent', () => {
    expect(threePs.condition({ 'day.rating': null })).toBe(false);
    expect(threePs.condition({})).toBe(false);
  });

  it('reads day.rating, not yesterday.rating', () => {
    expect(threePs.condition({ 'yesterday.rating': 1, 'day.rating': 4 })).toBe(false);
  });
});

describe('ch02.friend condition', () => {
  it('is true at yesterday.rating 2 and 1', () => {
    expect(friend.condition({ 'yesterday.rating': 2 })).toBe(true);
    expect(friend.condition({ 'yesterday.rating': 1 })).toBe(true);
  });

  it('is false at yesterday.rating 3', () => {
    expect(friend.condition({ 'yesterday.rating': 3 })).toBe(false);
  });

  it('is false when yesterday.rating is null or absent', () => {
    expect(friend.condition({ 'yesterday.rating': null })).toBe(false);
    expect(friend.condition({})).toBe(false);
  });

  it('ignores day.rating', () => {
    expect(friend.condition({ 'day.rating': 1 } as Signals)).toBe(false);
  });
});
