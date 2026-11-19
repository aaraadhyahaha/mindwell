import { describe, expect, it } from 'vitest';
import type { PromptDef, PromptShownRecord } from '@mindwell/core';
import { FALLBACK_INTENT_ID, FALLBACK_JOURNAL_ID } from '@mindwell/core';
import { contextLines, dayHeading, dayRunningHead, isEveningOpen, phaseLabel, selectionFromRows, todayPhase } from './today';

function def(id: string, kind: 'intent' | 'journal'): PromptDef {
  return { id, module: 'core', kind, when: 'morning', technique: id, text: id, weight: 1, cooldownDays: 0, condition: () => true };
}

function row(id: string, prompt_id: string, kind: 'intent' | 'journal', position: number, replaced = 0): PromptShownRecord {
  return {
    id, created_at: '', updated_at: '', deleted_at: null, schema_version: 1,
    day: '2026-11-19', slot: 'morning', prompt_id, module: 'core', kind, technique: prompt_id,
    text: `shown ${prompt_id}`, position, replaced, feedback: null,
  };
}

const library = [def('a', 'intent'), def('b', 'journal'), def('c', 'journal'), def(FALLBACK_INTENT_ID, 'intent'), def(FALLBACK_JOURNAL_ID, 'journal')];

describe('selectionFromRows', () => {
  it('orders by position', () => {
    const s = selectionFromRows([row('3', 'c', 'journal', 2), row('1', 'a', 'intent', 0), row('2', 'b', 'journal', 1)], library);
    expect(s.journal.map((p) => p.prompt.id)).toEqual(['b', 'c']);
  });
  it('skips replaced rows', () => {
    const s = selectionFromRows([row('1', 'a', 'intent', 0), row('2', 'b', 'journal', 1, 1), row('3', 'c', 'journal', 1)], library);
    expect(s.journal.map((p) => p.prompt.id)).toEqual(['c']);
  });
  it('drops unknown prompts', () => {
    const s = selectionFromRows([row('1', 'gone', 'intent', 0), row('2', 'b', 'journal', 1)], library);
    expect(s.intent).toBeNull();
    expect(s.journal).toHaveLength(1);
  });
  it('splits intent from journal and keeps shown text', () => {
    const s = selectionFromRows([row('1', 'a', 'intent', 0), row('2', 'b', 'journal', 1)], library);
    expect(s.intent?.prompt.id).toBe('a');
    expect(s.intent?.text).toBe('shown a');
    expect(s.intent?.score).toBe(0);
    expect(s.journal.map((p) => p.prompt.id)).toEqual(['b']);
  });
  it('flags fallbacks', () => {
    const s = selectionFromRows([row('1', FALLBACK_INTENT_ID, 'intent', 0), row('2', FALLBACK_JOURNAL_ID, 'journal', 1), row('3', 'b', 'journal', 2)], library);
    expect(s.intent?.fallback).toBe(true);
    expect(s.journal.map((p) => p.fallback)).toEqual([true, false]);
  });
});

describe('isEveningOpen', () => {
  const at = (h: number, m = 0) => new Date(2026, 10, 19, h, m);
  it('is closed in the daytime without data', () => {
    expect(isEveningOpen(at(9), false)).toBe(false);
    expect(isEveningOpen(at(16, 59), false)).toBe(false);
    expect(isEveningOpen(at(4), false)).toBe(false);
  });
  it('opens from 17:00 until 04:00', () => {
    expect(isEveningOpen(at(17), false)).toBe(true);
    expect(isEveningOpen(at(23, 30), false)).toBe(true);
    expect(isEveningOpen(at(3, 59), false)).toBe(true);
  });
  it('is open whenever there is evening data', () => {
    expect(isEveningOpen(at(9), true)).toBe(true);
  });
});

describe('contextLines', () => {
  it('says nothing recorded when empty', () => {
    expect(contextLines({}, null)).toEqual(['Nothing recorded yesterday.']);
  });
  it('lists rating, intent and events', () => {
    const lines = contextLines(
      { 'yesterday.rating': 3, upcoming_events: ['Exam on Friday', { title: 'Viva' }, { text: 'Trip' }, 5] },
      { intent_text: 'Finish chapter', intent_result: 'partly' },
    );
    expect(lines).toEqual(['Yesterday: 3 of 5', "Yesterday's intent: Finish chapter (partly)", 'Exam on Friday', 'Viva', 'Trip']);
  });
});

describe('dayHeading', () => {
  it('formats weekday, date and month', () => {
    expect(dayHeading('2026-11-19')).toBe('Thursday 19 November');
  });
});

describe('dayRunningHead', () => {
  it('formats weekday, comma, date and month', () => {
    expect(dayRunningHead('2026-11-19')).toBe('Thursday, 19 November');
    expect(dayRunningHead('2027-01-03')).toBe('Sunday, 3 January');
  });
});

describe('todayPhase', () => {
  const at = (morningStage: 'basics' | 'prompts' | 'summary', eveningOpen: boolean, morningEditing = false) =>
    todayPhase({ morningStage, eveningOpen, morningEditing });
  it('shows the morning check-in until it is done', () => {
    expect(at('basics', false)).toBe('morning');
    expect(at('prompts', false)).toBe('morning');
  });
  it('then the day, then the evening once it opens', () => {
    expect(at('summary', false)).toBe('day');
    expect(at('summary', true)).toBe('evening');
  });
  it('opens the evening even when the morning was skipped', () => {
    expect(at('basics', true)).toBe('evening');
    expect(at('prompts', true)).toBe('evening');
  });
  it('shows the morning while it is being edited', () => {
    expect(at('basics', true, true)).toBe('morning');
    expect(at('basics', false, true)).toBe('morning');
  });
  it('labels each phase', () => {
    expect([phaseLabel('morning'), phaseLabel('day'), phaseLabel('evening')]).toEqual(['Morning', 'During the day', 'Evening']);
  });
});
