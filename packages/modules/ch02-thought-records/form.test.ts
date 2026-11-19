import { describe, expect, it } from 'vitest';
import type { Signals } from '@mindwell/core';
import {
  changedFields,
  coachLine,
  emptyFields,
  fieldsOf,
  findCapture,
  hasContent,
  missingForComplete,
  startParams,
  stepFilled,
  type FormFields,
} from './form';
import type { ThoughtRecord } from './schema';

const filled = (over: Partial<FormFields> = {}): FormFields => ({ ...emptyFields(), ...over });

describe('coachLine', () => {
  it('addresses the user by name when given one', () => {
    expect(coachLine('Sam')).toBe("Sam, what's true and what's one next step?");
  });

  it('trims the name', () => {
    expect(coachLine('  Sam  ')).toBe("Sam, what's true and what's one next step?");
  });

  it('falls back to the unnamed line for undefined, null, empty or blank names', () => {
    const plain = "What's true and what's one next step?";
    expect(coachLine(undefined)).toBe(plain);
    expect(coachLine(null)).toBe(plain);
    expect(coachLine('')).toBe(plain);
    expect(coachLine('   ')).toBe(plain);
  });
});

describe('startParams', () => {
  it('reads capture and id from the search string', () => {
    expect(startParams('?capture=c1&id=r9')).toEqual({ capture: 'c1', id: 'r9' });
  });

  it('is null for both when absent', () => {
    expect(startParams('')).toEqual({ capture: null, id: null });
    expect(startParams('?other=1')).toEqual({ capture: null, id: null });
  });

  it('treats an empty value as absent', () => {
    expect(startParams('?capture=&id=')).toEqual({ capture: null, id: null });
  });

  it('reads only id when capture is missing', () => {
    expect(startParams('?id=r9')).toEqual({ capture: null, id: 'r9' });
  });
});

describe('findCapture', () => {
  const s: Signals = {
    'ch01.captures_recent': [
      { id: 'c1', text: 'they will laugh at me', story_id: 's1', day: '2026-11-18' },
      { id: 'c2', text: 'the bus was late', story_id: null, day: '2026-11-17' },
      { id: 'c3', text: 42, story_id: 's1', day: '2026-11-17' },
      null,
    ],
  };

  it('finds a capture by id with its text and story', () => {
    expect(findCapture(s, 'c1')).toEqual({ id: 'c1', text: 'they will laugh at me', story_id: 's1' });
  });

  it('gives a null story_id when the capture has none', () => {
    expect(findCapture(s, 'c2')).toEqual({ id: 'c2', text: 'the bus was late', story_id: null });
  });

  it('is undefined for a missing id', () => {
    expect(findCapture(s, 'nope')).toBeUndefined();
  });

  it('is undefined for a null id', () => {
    expect(findCapture(s, null)).toBeUndefined();
  });

  it('is undefined for a capture whose text is not a string', () => {
    expect(findCapture(s, 'c3')).toBeUndefined();
  });

  it('is undefined when the signal is absent (ch01 inactive)', () => {
    expect(findCapture({}, 'c1')).toBeUndefined();
  });
});

describe('changedFields', () => {
  it('is empty when nothing differs', () => {
    expect(changedFields(emptyFields(), emptyFields())).toEqual({});
  });

  it('returns only the fields that differ, with their new values', () => {
    const now = filled({ situation: 'meeting', ps_permanent: 1 });
    expect(changedFields(emptyFields(), now)).toEqual({ situation: 'meeting', ps_permanent: 1 });
  });

  it('reports a change to 0 from null', () => {
    expect(changedFields(emptyFields(), filled({ intensity_before: 0 }))).toEqual({ intensity_before: 0 });
  });

  it('reports a cleared field', () => {
    expect(changedFields(filled({ feeling: 'shame' }), emptyFields())).toEqual({ feeling: '' });
  });
});

describe('hasContent', () => {
  it('is false for a blank form', () => {
    expect(hasContent(emptyFields())).toBe(false);
  });

  it('is false for whitespace-only text', () => {
    expect(hasContent(filled({ automatic_thought: '   ', situation: '\n\t' }))).toBe(false);
  });

  it('is true once text is typed', () => {
    expect(hasContent(filled({ situation: 'x' }))).toBe(true);
  });

  it('is true once a three-Ps toggle is on', () => {
    expect(hasContent(filled({ ps_pervasive: 1 }))).toBe(true);
  });

  it('is false for a toggle that is off', () => {
    expect(hasContent(filled({ ps_pervasive: 0 }))).toBe(false);
  });

  it('is true for a non-zero intensity', () => {
    expect(hasContent(filled({ intensity_before: 50 }))).toBe(true);
  });

  it('is true for an intensity of 0 (0 is a valid rating)', () => {
    expect(hasContent(filled({ intensity_before: 0 }))).toBe(true);
  });
});

describe('stepFilled', () => {
  it('situation: non-blank text', () => {
    expect(stepFilled('situation', filled({ situation: '  ' }))).toBe(false);
    expect(stepFilled('situation', filled({ situation: 'at work' }))).toBe(true);
  });

  it('thought: non-blank automatic thought', () => {
    expect(stepFilled('thought', filled({ automatic_thought: ' ' }))).toBe(false);
    expect(stepFilled('thought', filled({ automatic_thought: 'I failed' }))).toBe(true);
  });

  it('feeling: needs both a feeling word and an intensity', () => {
    expect(stepFilled('feeling', filled({ feeling: 'anxious' }))).toBe(false);
    expect(stepFilled('feeling', filled({ intensity_before: 70 }))).toBe(false);
    expect(stepFilled('feeling', filled({ feeling: 'anxious', intensity_before: 70 }))).toBe(true);
  });

  it('evidence_for and evidence_against: non-blank text', () => {
    expect(stepFilled('evidence_for', filled({ evidence_for: ' ' }))).toBe(false);
    expect(stepFilled('evidence_for', filled({ evidence_for: 'two late' }))).toBe(true);
    expect(stepFilled('evidence_against', filled({ evidence_against: '' }))).toBe(false);
    expect(stepFilled('evidence_against', filled({ evidence_against: 'I finished' }))).toBe(true);
  });

  it('three_ps: any toggle on', () => {
    expect(stepFilled('three_ps', emptyFields())).toBe(false);
    expect(stepFilled('three_ps', filled({ ps_permanent: 1 }))).toBe(true);
    expect(stepFilled('three_ps', filled({ ps_personal: 1 }))).toBe(true);
  });

  it('balanced: non-blank balanced thought', () => {
    expect(stepFilled('balanced', filled({ balanced_thought: '   ' }))).toBe(false);
    expect(stepFilled('balanced', filled({ balanced_thought: 'Some days are harder' }))).toBe(true);
  });

  it('after: an intensity, including 0', () => {
    expect(stepFilled('after', emptyFields())).toBe(false);
    expect(stepFilled('after', filled({ intensity_after: 0 }))).toBe(true);
  });
});

describe('missingForComplete', () => {
  it('lists thought, feeling and after for a blank form, in order', () => {
    expect(missingForComplete(emptyFields()).map((s) => s.key)).toEqual(['thought', 'feeling', 'after']);
  });

  it('is empty when steps ii, iii and viii are filled', () => {
    const f = filled({ automatic_thought: 'I failed', feeling: 'ashamed', intensity_before: 80, intensity_after: 40 });
    expect(missingForComplete(f)).toEqual([]);
  });

  it('lists only the steps still missing', () => {
    const f = filled({ automatic_thought: 'I failed', feeling: 'ashamed', intensity_before: 80 });
    expect(missingForComplete(f).map((s) => s.key)).toEqual(['after']);
  });

  it('ignores optional steps', () => {
    const f = filled({ automatic_thought: 'I failed', feeling: 'ashamed', intensity_before: 80, intensity_after: 40 });
    expect(missingForComplete({ ...f, situation: '', evidence_for: '', balanced_thought: '' })).toEqual([]);
  });
});

describe('fieldsOf', () => {
  it('copies only the editable fields of a stored record', () => {
    const r = {
      ...emptyFields(),
      id: '01X',
      day: '2026-11-19',
      capture_id: 'c1',
      story_id: 's1',
      situation: 'meeting',
      intensity_before: 60,
      complete: 0,
      created_at: '2026-11-19T00:00:00Z',
      updated_at: '2026-11-19T00:00:00Z',
      deleted_at: null,
      schema_version: 1,
    } as unknown as ThoughtRecord;
    const f = fieldsOf(r);
    expect(Object.keys(f).sort()).toEqual(Object.keys(emptyFields()).sort());
    expect(f.situation).toBe('meeting');
    expect(f.intensity_before).toBe(60);
  });
});
