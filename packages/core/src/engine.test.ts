import { describe, expect, it } from 'vitest';
import type { Module } from './module';
import type { PromptDef, SignalValue, Signals } from './prompts';
import {
  type SelectionInput,
  candidates,
  daysSinceShown,
  jitter,
  promptLibrary,
  renderPrompt,
  scorePrompt,
  selectPrompts,
  showAnother,
  usefulness,
} from './engine';
import { corePrompts, FALLBACK_INTENT_ID, FALLBACK_JOURNAL_ID } from './core-prompts';
import { addDays } from './dates';

const TODAY = '2026-11-19';

// ---- Factories ----

const BASE_SIGNALS: Record<string, SignalValue> = {
  'day.types': [],
  'day.energy': null,
  'day.rating': null,
  'yesterday.rating': null,
  'yesterday.intent_result': null,
  'user.name': 'Ada',
  upcoming_events: [],
  'chapters.recently_unlocked': [],
};

function sig(over: Record<string, SignalValue> = {}): Signals {
  return { ...BASE_SIGNALS, ...over };
}

/** A prompt with a unique technique by default, journal + anytime + always-true condition. */
function prompt(id: string, over: Partial<PromptDef> = {}): PromptDef {
  return {
    id,
    module: id.split('.')[0]!,
    kind: 'journal',
    when: 'anytime',
    technique: `t.${id}`,
    text: `Prompt ${id}?`,
    weight: 1,
    cooldownDays: 0,
    condition: () => true,
    ...over,
  };
}

function mod(id: string, chapter: number, prompts: PromptDef[]): Module<unknown> {
  return {
    manifest: { id, chapter, title: id, idea: '', evidence: '', references: [] },
    migrations: [],
    screens: [],
    todayCards: [],
    prompts,
    signals: [],
    reviewSections: [],
    suggestions: [],
    experiments: [],
  };
}

function input(over: Partial<SelectionInput> = {}): SelectionInput {
  return {
    slot: 'morning',
    day: TODAY,
    prompts: [],
    signals: sig(),
    lastShown: {},
    stats: {},
    ...over,
  };
}

const ids = (ps: { prompt: PromptDef }[]): string[] => ps.map((p) => p.prompt.id);

// ---- 1. Conditions ----

describe('conditions', () => {
  it('excludes a prompt whose condition is false', () => {
    const off = prompt('a.off', { condition: () => false });
    const on = prompt('a.on');
    const got = ids(candidates(input({ prompts: [off, on] }), 'journal'));
    expect(got).toEqual(['a.on']);
  });

  it('excludes a prompt whose condition throws, without failing the pick', () => {
    const boom = prompt('a.boom', {
      condition: () => {
        throw new Error('bad condition');
      },
    });
    const ok = prompt('a.ok');
    const inp = input({ prompts: [boom, ok] });
    expect(() => candidates(inp, 'journal')).not.toThrow();
    expect(ids(candidates(inp, 'journal'))).toEqual(['a.ok']);
    expect(() => selectPrompts(inp)).not.toThrow();
    expect(ids(selectPrompts(inp).journal)).toEqual(['a.ok']);
  });

  it('core light_day intent only when "light" is in day.types', () => {
    const lib = promptLibrary([], []);
    const light = input({ prompts: lib, signals: sig({ 'day.types': ['light'] }) });
    expect(ids(candidates(light, 'intent'))).toEqual(['core.intent.light_day']);

    const notLight = input({ prompts: lib, signals: sig({ 'day.types': ['exam', 'social'] }) });
    expect(ids(candidates(notLight, 'intent'))).toEqual([]);
  });

  it('core hard_yesterday qualifies for yesterday.rating 2, not 3, not null', () => {
    const lib = promptLibrary([], []);
    const hardIds = (rating: SignalValue) =>
      ids(candidates(input({ prompts: lib, signals: sig({ 'yesterday.rating': rating }) }), 'journal'));

    expect(hardIds(2)).toContain('core.journal.hard_yesterday');
    expect(hardIds(1)).toContain('core.journal.hard_yesterday');
    expect(hardIds(3)).not.toContain('core.journal.hard_yesterday');
    expect(hardIds(null)).not.toContain('core.journal.hard_yesterday');
  });
});

// ---- 2. when ----

describe('when', () => {
  const morningOnly = prompt('a.morning', { kind: 'journal', when: 'morning' });
  const eveningOnly = prompt('a.evening', { kind: 'journal', when: 'evening' });
  const anytime = prompt('a.any', { kind: 'journal', when: 'anytime' });

  it('morning pick takes morning and anytime, not evening', () => {
    const got = ids(candidates(input({ slot: 'morning', prompts: [morningOnly, eveningOnly, anytime] }), 'journal'));
    expect(got).toContain('a.morning');
    expect(got).toContain('a.any');
    expect(got).not.toContain('a.evening');
  });

  it('evening pick takes evening and anytime', () => {
    const got = ids(candidates(input({ slot: 'evening', prompts: [morningOnly, eveningOnly, anytime] }), 'journal'));
    expect(got).toContain('a.evening');
    expect(got).toContain('a.any');
    expect(got).not.toContain('a.morning');
  });
});

// ---- 3. Cooldown ----

describe('cooldown', () => {
  const p = prompt('a.cool', { cooldownDays: 3 });

  it('cooldown 3, shown 2 days ago: excluded', () => {
    const inp = input({ prompts: [p], lastShown: { 'a.cool': '2026-11-17' } });
    expect(ids(candidates(inp, 'journal'))).toEqual([]);
  });

  it('cooldown 3, shown exactly 3 days ago: included', () => {
    const inp = input({ prompts: [p], lastShown: { 'a.cool': '2026-11-16' } });
    expect(ids(candidates(inp, 'journal'))).toEqual(['a.cool']);
  });

  it('never shown: included', () => {
    expect(ids(candidates(input({ prompts: [p] }), 'journal'))).toEqual(['a.cool']);
    expect(daysSinceShown({}, 'a.cool', TODAY)).toBe(Infinity);
  });

  it('cooldown 0, shown today: included', () => {
    const zero = prompt('a.zero', { cooldownDays: 0 });
    const inp = input({ prompts: [zero], lastShown: { 'a.zero': TODAY } });
    expect(ids(candidates(inp, 'journal'))).toEqual(['a.zero']);
  });

  it('a future last-shown day counts as 0 days', () => {
    const future = '2026-11-21';
    expect(daysSinceShown({ 'a.cool': future }, 'a.cool', TODAY)).toBe(0);
    // 0 days is less than cooldown 3, so it stays excluded.
    expect(ids(candidates(input({ prompts: [p], lastShown: { 'a.cool': future } }), 'journal'))).toEqual([]);
    // With cooldown 0 a future day does not block.
    const zero = prompt('a.zero', { cooldownDays: 0 });
    expect(ids(candidates(input({ prompts: [zero], lastShown: { 'a.zero': future } }), 'journal'))).toEqual(['a.zero']);
  });

  it('day rollover across a month boundary is counted correctly', () => {
    expect(daysSinceShown({ x: '2026-11-29' }, 'x', '2026-12-01')).toBe(2);
    expect(daysSinceShown({ x: '2026-12-31' }, 'x', '2027-01-01')).toBe(1);
    expect(daysSinceShown({ x: addDays(TODAY, -3) }, 'x', TODAY)).toBe(3);
  });
});

// ---- 4. Technique de-dup and limits ----

describe('technique de-dup and limits', () => {
  it('at most one journal prompt per technique', () => {
    const a1 = prompt('a.1', { technique: 'T1', weight: 3 });
    const a2 = prompt('a.2', { technique: 'T1', weight: 2 });
    const b = prompt('a.3', { technique: 'T2', weight: 1 });
    const sel = selectPrompts(input({ prompts: [a1, a2, b] }));
    const techs = sel.journal.map((p) => p.prompt.technique);
    expect(new Set(techs).size).toBe(techs.length);
    expect(ids(sel.journal)).toEqual(['a.1', 'a.3']);
  });

  it('the intent technique blocks a journal prompt with the same technique', () => {
    const intent = prompt('a.intent', { kind: 'intent', technique: 'T1', weight: 5 });
    const sameTech = prompt('a.j1', { technique: 'T1', weight: 3 });
    const other = prompt('a.j2', { technique: 'T2', weight: 1 });
    const sel = selectPrompts(input({ prompts: [intent, sameTech, other] }));
    expect(sel.intent?.prompt.id).toBe('a.intent');
    expect(ids(sel.journal)).toEqual(['a.j2']);
  });

  it('morning: max 3 journal prompts', () => {
    const many = ['A', 'B', 'C', 'D', 'E'].map((x, i) => prompt(`a.${x}`, { weight: 5 - i }));
    expect(selectPrompts(input({ slot: 'morning', prompts: many })).journal).toHaveLength(3);
  });

  it('evening: max 1 journal prompt and no intent', () => {
    const intent = prompt('a.intent', { kind: 'intent', when: 'anytime' });
    const many = ['A', 'B', 'C'].map((x, i) => prompt(`a.${x}`, { weight: 3 - i }));
    const sel = selectPrompts(input({ slot: 'evening', prompts: [intent, ...many] }));
    expect(sel.journal).toHaveLength(1);
    expect(sel.intent).toBeNull();
  });
});

// ---- 5. Scoring ----

describe('scoring', () => {
  it('usefulness: 1 at 0/0 and undefined', () => {
    expect(usefulness(undefined)).toBe(1);
    expect(usefulness({ rated: 0, useful: 0 })).toBe(1);
  });

  it('usefulness: (useful+1)/(rated+2)*2 otherwise', () => {
    expect(usefulness({ rated: 2, useful: 2 })).toBeCloseTo((3 / 4) * 2, 10);
    expect(usefulness({ rated: 3, useful: 0 })).toBeCloseTo((1 / 5) * 2, 10);
    expect(usefulness({ rated: 2, useful: 1 })).toBeCloseTo(1, 10);
  });

  it('usefulness tends to 0 for many not-useful ratings', () => {
    const u = usefulness({ rated: 100, useful: 0 });
    expect(u).toBeLessThan(0.05);
    expect(u).toBeGreaterThan(0);
  });

  it('higher stats reorder picks', () => {
    const a = prompt('a.a', { technique: 'TA' });
    const b = prompt('a.b', { technique: 'TB' });
    const sel = selectPrompts(
      input({
        slot: 'evening',
        prompts: [a, b],
        stats: {
          'a.a': { rated: 10, useful: 0 },
          'a.b': { rated: 10, useful: 10 },
        },
      }),
    );
    expect(ids(sel.journal)).toEqual(['a.b']);
  });

  it('weight multiplies the score', () => {
    const base = prompt('a.w', { weight: 1 });
    const heavy = prompt('a.w', { weight: 2 });
    const inp = input({ day: TODAY });
    expect(scorePrompt(heavy, inp)).toBeCloseTo(2 * scorePrompt(base, inp), 10);
  });
});

// ---- 6. Novelty ----

describe('novelty', () => {
  it('module in chapters.recently_unlocked gets exactly ×1.25', () => {
    const p = prompt('ch02.x', { module: 'ch02' });
    const without = scorePrompt(p, input({ signals: sig({ 'chapters.recently_unlocked': [] }) }));
    const withIt = scorePrompt(p, input({ signals: sig({ 'chapters.recently_unlocked': ['ch02'] }) }));
    expect(withIt / without).toBeCloseTo(1.25, 10);
  });

  it('a different module in the list gives no bonus', () => {
    const p = prompt('ch02.x', { module: 'ch02' });
    const without = scorePrompt(p, input({ signals: sig({ 'chapters.recently_unlocked': [] }) }));
    const other = scorePrompt(p, input({ signals: sig({ 'chapters.recently_unlocked': ['ch05'] }) }));
    expect(other).toBe(without);
  });
});

// ---- 7. Jitter ----

describe('jitter', () => {
  it('is always within [0.9, 1.1]', () => {
    for (let i = 0; i < 365; i++) {
      for (const id of ['a.one', 'core.journal.default', 'ch07.x']) {
        const j = jitter(addDays(TODAY, -i), id);
        expect(j).toBeGreaterThanOrEqual(0.9);
        expect(j).toBeLessThanOrEqual(1.1);
      }
    }
  });

  it('same day and id give the same value', () => {
    expect(jitter(TODAY, 'a.one')).toBe(jitter(TODAY, 'a.one'));
  });

  it('varies across days and spreads across the range', () => {
    const values = Array.from({ length: 365 }, (_, i) => jitter(addDays(TODAY, i), 'a.one'));
    expect(new Set(values).size).toBeGreaterThan(1);
    expect(Math.min(...values)).toBeLessThan(0.95);
    expect(Math.max(...values)).toBeGreaterThan(1.05);
  });

  it('selectPrompts output is identical for identical input', () => {
    const prompts = [prompt('a.1', { technique: 'T1' }), prompt('a.2', { technique: 'T2' }), prompt('a.3', { technique: 'T3' })];
    const inp = input({ prompts });
    expect(selectPrompts(inp)).toEqual(selectPrompts(inp));
  });
});

// ---- 8. Fallbacks ----

describe('fallbacks', () => {
  it('morning with no qualifying intent uses core.intent.default with fallback true', () => {
    const sel = selectPrompts(input({ prompts: promptLibrary([], []) }));
    expect(sel.intent?.prompt.id).toBe(FALLBACK_INTENT_ID);
    expect(sel.intent?.fallback).toBe(true);
  });

  it('morning with no qualifying journal uses core.journal.default with fallback true', () => {
    const sel = selectPrompts(input({ prompts: promptLibrary([], []), lastShown: { 'core.evening.surprise': TODAY } }));
    expect(sel.journal.map((p) => p.prompt.id)).toContain(FALLBACK_JOURNAL_ID);
    const fb = sel.journal.find((p) => p.prompt.id === FALLBACK_JOURNAL_ID);
    expect(fb?.fallback).toBe(true);
  });

  it('a default is never picked when another candidate qualifies, even if the default scores higher', () => {
    const intentDefault = corePrompts.find((p) => p.id === FALLBACK_INTENT_ID)!;
    const journalDefault = corePrompts.find((p) => p.id === FALLBACK_JOURNAL_ID)!;
    const lowIntent = prompt('a.intent', { kind: 'intent', technique: 'TI', weight: 0.1 });
    const lowJournal = prompt('a.journal', { technique: 'TJ', weight: 0.1 });
    const inp = input({ prompts: [intentDefault, journalDefault, lowIntent, lowJournal] });

    // Sanity: the default would outscore the candidates.
    expect(scorePrompt(intentDefault, inp)).toBeGreaterThan(scorePrompt(lowIntent, inp));

    const sel = selectPrompts(inp);
    expect(sel.intent?.prompt.id).toBe('a.intent');
    expect(sel.intent?.fallback).toBe(false);
    expect(ids(sel.journal)).toEqual(['a.journal']);
    expect(sel.journal.every((p) => !p.fallback)).toBe(true);
  });

  it('evening with nothing qualifying: intent null and journal []', () => {
    const sel = selectPrompts(
      input({
        slot: 'evening',
        prompts: promptLibrary([], []),
        lastShown: { 'core.evening.surprise': addDays(TODAY, -1) },
      }),
    );
    expect(sel.intent).toBeNull();
    expect(sel.journal).toEqual([]);
  });
});

// ---- 9. Placeholders ----

describe('placeholders', () => {
  it('{name} is filled from user.name', () => {
    const p = prompt('a.name', { text: 'Hi {name}, what matters?' });
    expect(renderPrompt(p, sig({ 'user.name': 'Ada' }))).toBe('Hi Ada, what matters?');
  });

  it('missing name: prompt is not a candidate', () => {
    const p = prompt('a.name', { text: 'Hi {name}?' });
    expect(renderPrompt(p, sig({ 'user.name': null }))).toBeNull();
    expect(candidates(input({ prompts: [p], signals: sig({ 'user.name': null }) }), 'journal')).toEqual([]);
  });

  it('fill values are used in the text', () => {
    const p = prompt('a.story', {
      text: '{name}, think about {story} ({n} times)',
      fill: () => ({ story: 'the meeting', n: 3 }),
    });
    expect(renderPrompt(p, sig())).toBe('Ada, think about the meeting (3 times)');
  });

  it('fill returning null excludes the prompt', () => {
    const p = prompt('a.skip', { text: 'About {story}?', fill: () => null });
    expect(renderPrompt(p, sig())).toBeNull();
    expect(candidates(input({ prompts: [p] }), 'journal')).toEqual([]);
  });

  it('a placeholder fill does not provide stays unresolved, so the prompt is excluded', () => {
    const p = prompt('a.event', { text: 'About {event}?', fill: () => ({ story: 'x' }) });
    expect(renderPrompt(p, sig())).toBeNull();
    expect(candidates(input({ prompts: [p] }), 'journal')).toEqual([]);
  });
});

// ---- 10. Inactive modules ----

describe('inactive modules', () => {
  const ch02 = mod('ch02', 2, [prompt('ch02.a', { module: 'ch02' })]);
  const ch03 = mod('ch03', 3, [prompt('ch03.top', { module: 'ch03', weight: 100 })]);

  it('library includes core and read chapters only', () => {
    const lib = promptLibrary([ch02, ch03], [2]);
    const libIds = lib.map((p) => p.id);
    for (const c of corePrompts) expect(libIds).toContain(c.id);
    expect(libIds).toContain('ch02.a');
    expect(libIds).not.toContain('ch03.top');
  });

  it('a selection never returns an inactive module prompt, even the highest scorer', () => {
    const lib = promptLibrary([ch02, ch03], [2]);
    const sel = selectPrompts(input({ prompts: lib, signals: sig({ 'day.types': ['light'] }) }));
    const picked = [sel.intent, ...sel.journal].filter((p) => p !== null).map((p) => p!.prompt.id);
    expect(picked).not.toContain('ch03.top');
  });
});

// ---- 11. Show another ----

describe('showAnother', () => {
  // Weights 5..1 keep the order A > B > C > D > E despite ±10% jitter.
  const journals = [
    prompt('a.A', { technique: 'TA', weight: 5 }),
    prompt('a.B', { technique: 'TB', weight: 4 }),
    prompt('a.C', { technique: 'TC', weight: 3 }),
    prompt('a.D', { technique: 'TD', weight: 2 }),
    prompt('a.E', { technique: 'TE', weight: 1 }),
  ];

  it('replaces with the next eligible prompt of the same kind at the same position', () => {
    const inp = input({ prompts: journals });
    const sel = selectPrompts(inp);
    expect(ids(sel.journal)).toEqual(['a.A', 'a.B', 'a.C']);

    const res = showAnother(inp, sel, 'a.A');
    expect(res).not.toBeNull();
    expect(res!.replaced.prompt.id).toBe('a.A');
    expect(res!.next.prompt.id).toBe('a.D');
    expect(ids(res!.selection.journal)).toEqual(['a.D', 'a.B', 'a.C']);
  });

  it('skips seen ids', () => {
    const inp = input({ prompts: journals });
    const sel = selectPrompts(inp);
    expect(showAnother(inp, sel, 'a.A', ['a.D'])?.next.prompt.id).toBe('a.E');
    expect(showAnother(inp, sel, 'a.A', ['a.D', 'a.E'])).toBeNull();
  });

  it('skips prompts already on screen', () => {
    const inp = input({ prompts: journals });
    const sel = selectPrompts(inp);
    // A is replaced; B and C are on screen, so D is the only option. Also confirm no duplicate.
    const res = showAnother(inp, sel, 'a.C');
    expect(res!.next.prompt.id).toBe('a.D');
    expect(ids(res!.selection.journal).filter((x) => x === 'a.D')).toHaveLength(1);
  });

  it('respects techniques of other prompts on screen', () => {
    // D shares technique TB with B, which stays on screen, so D must be skipped.
    const dSameAsB = prompt('a.D', { technique: 'TB', weight: 2 });
    const inp = input({ prompts: [journals[0]!, journals[1]!, journals[2]!, dSameAsB, journals[4]!] });
    const sel = selectPrompts(inp);
    expect(ids(sel.journal)).toEqual(['a.A', 'a.B', 'a.C']);
    expect(showAnother(inp, sel, 'a.A')?.next.prompt.id).toBe('a.E');
  });

  it('returns null when nothing else is eligible (swapping a fallback journal)', () => {
    // No regular journal candidates, so the journal is the core default.
    const inp = input({ prompts: promptLibrary([], []), lastShown: { 'core.evening.surprise': TODAY } });
    const sel = selectPrompts(inp);
    const fb = sel.journal.find((p) => p.prompt.id === FALLBACK_JOURNAL_ID);
    expect(fb).toBeDefined();
    expect(showAnother(inp, sel, FALLBACK_JOURNAL_ID)).toBeNull();
  });

  it('returns null when the id is not on screen', () => {
    const inp = input({ prompts: journals });
    expect(showAnother(inp, selectPrompts(inp), 'a.E')).toBeNull();
  });

  it('intent swap respects techniques of journal prompts on screen', () => {
    // Per PROMPTS.md, one technique per pick: a replacement intent must not reuse
    // the technique of a journal prompt still on screen.
    const i1 = prompt('a.I1', { kind: 'intent', technique: 'TI1', weight: 5 });
    const i2 = prompt('a.I2', { kind: 'intent', technique: 'TX', weight: 4 });
    const j = prompt('a.J', { technique: 'TX', weight: 1 });
    const inp = input({ prompts: [i1, i2, j] });
    const sel = selectPrompts(inp);
    expect(sel.intent?.prompt.id).toBe('a.I1');
    // J is blocked by the intent? No: intent is I1 (TI1), so J (TX) is picked.
    expect(ids(sel.journal)).toEqual(['a.J']);
    expect(showAnother(inp, sel, 'a.I1')).toBeNull();
  });

  it('intent swap picks the next intent when no technique clash', () => {
    const i1 = prompt('a.I1', { kind: 'intent', technique: 'TI1', weight: 5 });
    const i2 = prompt('a.I2', { kind: 'intent', technique: 'TI2', weight: 4 });
    const inp = input({ prompts: [i1, i2] });
    const sel = selectPrompts(inp);
    const res = showAnother(inp, sel, 'a.I1');
    expect(res?.next.prompt.id).toBe('a.I2');
    expect(res?.selection.intent?.prompt.id).toBe('a.I2');
  });
});
