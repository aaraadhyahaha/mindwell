import { describe, expect, it } from 'vitest';
import { addDays, candidates, renderPrompt, selectPrompts, type PromptDef, type SelectionInput, type Signals } from '@mindwell/core';
import { GRATITUDE_GAP_DAYS, prompts } from './prompts';

const byId = (id: string): PromptDef => {
  const p = prompts.find((x) => x.id === id);
  if (!p) throw new Error(`no prompt ${id}`);
  return p;
};
const excited = byId('ch03.intent.excited');
const defuse = byId('ch03.defuse_story');
const offer = byId('ch03.offer_series');
const gratitude = byId('ch03.gratitude');

const story = { id: 's1', name: 'money worries', days: 5 };
const event = { id: 'e1', title: 'Viva', starts_at: '2026-11-20T14:00:00.000Z' };
const activeSeries = { id: 's1', topic: 'money', planned: 3, day_n: 1, done_today: false };

const sig = (over: Record<string, unknown> = {}): Signals => ({ 'day.types': [], 'day.rating': null, ...over }) as Signals;

describe('prompt table (ids, kinds, timing, cooldowns)', () => {
  it('matches the spec table', () => {
    expect(prompts.map((p) => [p.id, p.module, p.kind, p.when, p.technique, p.cooldownDays])).toEqual([
      ['ch03.intent.excited', 'ch03', 'intent', 'morning', 'reappraisal', 1],
      ['ch03.defuse_story', 'ch03', 'journal', 'morning', 'defusion', 7],
      ['ch03.offer_series', 'ch03', 'journal', 'morning', 'expressive', 14],
      ['ch03.gratitude', 'ch03', 'journal', 'evening', 'gratitude', 4],
    ]);
  });
});

describe('ch03.intent.excited', () => {
  it('is true with an event today', () => {
    expect(excited.condition(sig({ 'ch03.event_today': event }))).toBe(true);
  });

  it('is true on an exam or stressful_event day, with or without an event', () => {
    expect(excited.condition(sig({ 'day.types': ['exam'] }))).toBe(true);
    expect(excited.condition(sig({ 'day.types': ['work', 'stressful_event'] }))).toBe(true);
  });

  it('is false on other days and with no event today', () => {
    expect(excited.condition(sig({ 'day.types': ['work', 'rest'] }))).toBe(false);
    expect(excited.condition(sig({ 'ch03.event_today': null }))).toBe(false);
    expect(excited.condition(sig())).toBe(false);
  });

  it('has no fill and renders its text unchanged', () => {
    expect(excited.fill).toBeUndefined();
    expect(renderPrompt(excited, sig({ 'ch03.event_today': event }))).toBe(excited.text);
  });
});

describe('ch03.defuse_story', () => {
  it('is true when ch01 has a repeating story', () => {
    expect(defuse.condition(sig({ 'ch01.repeating_story': story }))).toBe(true);
  });

  it('is false without a repeating story or with a malformed one', () => {
    expect(defuse.condition(sig())).toBe(false);
    expect(defuse.condition(sig({ 'ch01.repeating_story': null }))).toBe(false);
    expect(defuse.condition(sig({ 'ch01.repeating_story': { id: 's1', days: 5 } }))).toBe(false);
  });

  it('fills {story} from the repeating story name', () => {
    const s = sig({ 'ch01.repeating_story': story });
    expect(defuse.fill?.(s)).toEqual({ story: 'money worries' });
    expect(renderPrompt(defuse, s)).toBe(
      'Write "I\'m having the thought that money worries" five times. Notice how it feels by the fifth.',
    );
  });

  it('is not a candidate without a story (placeholder unresolved)', () => {
    const input: SelectionInput = { slot: 'morning', day: '2026-11-20', prompts: [defuse], signals: sig(), lastShown: {}, stats: {} };
    expect(candidates(input, 'journal')).toEqual([]);
  });
});

describe('ch03.offer_series', () => {
  it('is true with a repeating story and no active series', () => {
    expect(offer.condition(sig({ 'ch01.repeating_story': story }))).toBe(true);
  });

  it('is false while a series is active', () => {
    expect(offer.condition(sig({ 'ch01.repeating_story': story, 'ch03.series_active': activeSeries }))).toBe(false);
  });

  it('is false without a repeating story', () => {
    expect(offer.condition(sig({ 'ch03.series_active': null }))).toBe(false);
  });

  it('fills {story}', () => {
    expect(renderPrompt(offer, sig({ 'ch01.repeating_story': story }))).toBe(
      '"money worries" has been with you most days this week. Consider a 3-day writing series on it.',
    );
  });
});

describe('ch03.gratitude', () => {
  const ok = (days: unknown, rating: unknown) => sig({ 'ch03.days_since_gratitude': days as number, 'day.rating': rating as number });

  it('gap threshold is 4 days', () => {
    expect(GRATITUDE_GAP_DAYS).toBe(4);
  });

  it('days_since_gratitude boundary: 3 is false, 4 is true', () => {
    expect(gratitude.condition(ok(3, 5))).toBe(false);
    expect(gratitude.condition(ok(4, 5))).toBe(true);
  });

  it('never done (Infinity) counts as eligible', () => {
    expect(gratitude.condition(ok(Infinity, 4))).toBe(true);
  });

  it('day.rating boundary: 3 is true, 2 is false, null is false', () => {
    expect(gratitude.condition(ok(10, 3))).toBe(true);
    expect(gratitude.condition(ok(10, 2))).toBe(false);
    expect(gratitude.condition(ok(10, null))).toBe(false);
  });

  it('marking done (days since < 4) hides it, even on a good day', () => {
    expect(gratitude.condition(ok(0, 5))).toBe(false);
    expect(gratitude.condition(ok(2, 5))).toBe(false);
  });

  it('is not a morning candidate', () => {
    const input: SelectionInput = {
      slot: 'morning',
      day: '2026-11-20',
      prompts: [gratitude],
      signals: ok(Infinity, 5),
      lastShown: {},
      stats: {},
    };
    expect(candidates(input, 'journal')).toEqual([]);
  });
});

describe('acceptance: gratitude prompt never appears more than twice in 7 days', () => {
  it('28 evenings, never marked done, rating 4: no 7-day window has more than 2 shows', () => {
    const START = '2026-11-01';
    const DAYS = 28;
    const lastShown: Record<string, string> = {};
    const shows: string[] = [];

    for (let i = 0; i < DAYS; i++) {
      const day = addDays(START, i);
      const signals = sig({ 'day.rating': 4, 'ch03.days_since_gratitude': Infinity });
      const input: SelectionInput = { slot: 'evening', day, prompts, signals, lastShown, stats: {} };

      const isCandidate = candidates(input, 'journal').some((c) => c.prompt.id === gratitude.id);
      const picked = selectPrompts(input).journal.some((c) => c.prompt.id === gratitude.id);
      if (picked || isCandidate) {
        lastShown[gratitude.id] = day;
      }
      if (picked) shows.push(day);
    }

    // Non-vacuous: it is shown repeatedly across the 28 evenings.
    expect(shows.length).toBeGreaterThanOrEqual(6);

    for (let s = 0; s + 7 <= DAYS; s++) {
      const windowStart = addDays(START, s);
      const windowEnd = addDays(START, s + 6);
      const count = shows.filter((d) => d >= windowStart && d <= windowEnd).length;
      expect(count, `window ${windowStart}..${windowEnd}`).toBeLessThanOrEqual(2);
    }
  });
});
