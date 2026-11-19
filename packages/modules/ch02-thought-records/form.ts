import type { SignalValue, Signals } from '@mindwell/core';
import { signalList } from '@mindwell/core';
import type { DraftPatch, ThoughtRecord } from './schema';

/** The form's fields (everything a user types or toggles). */
export type FormFields = Required<DraftPatch>;

export type StepKey =
  | 'situation'
  | 'thought'
  | 'feeling'
  | 'evidence_for'
  | 'evidence_against'
  | 'three_ps'
  | 'balanced'
  | 'after';

export interface StepDef {
  key: StepKey;
  /** Italic roman numeral shown before the title ("iii."). */
  n: string;
  title: string;
  /** Short name in the margin's step list. */
  short: string;
}

export const STEPS: readonly StepDef[] = [
  { key: 'situation', n: 'i.', title: 'What was happening?', short: 'Situation' },
  { key: 'thought', n: 'ii.', title: 'The thought, word for word', short: 'The thought' },
  { key: 'feeling', n: 'iii.', title: 'What did you feel, and how strongly?', short: 'Feeling' },
  { key: 'evidence_for', n: 'iv.', title: 'Evidence for the thought', short: 'Evidence for' },
  { key: 'evidence_against', n: 'v.', title: 'Evidence against it', short: 'Evidence against' },
  { key: 'three_ps', n: 'vi.', title: 'Permanent, pervasive or personal?', short: 'Three Ps' },
  { key: 'balanced', n: 'vii.', title: 'A balanced thought', short: 'Balanced thought' },
  { key: 'after', n: 'viii.', title: 'How strong is the feeling now?', short: 'Feeling now' },
];

export type PsKey = 'ps_permanent' | 'ps_pervasive' | 'ps_personal';

/** The three-Ps toggles and the rewrite hint each one shows when on. */
export const THREE_PS: readonly { key: PsKey; label: string; question: string; hint: string }[] = [
  {
    key: 'ps_permanent',
    label: 'Permanent',
    question: 'Does it say this will always be so?',
    hint: "Make it temporary: “right now…”, “this week…”",
  },
  {
    key: 'ps_pervasive',
    label: 'Pervasive',
    question: 'Does it spread to everything?',
    hint: "Make it specific: “in this one test…”, not “in everything”",
  },
  {
    key: 'ps_personal',
    label: 'Personal',
    question: 'Does it put all of it on you?',
    hint: 'Make it fair: what else played a part besides you?',
  },
];

/** The coach-by-name line on the balanced-thought step (Kross et al., 2014). Pure. */
export function coachLine(name: string | undefined | null): string {
  const n = name?.trim();
  return n ? `${n}, what's true and what's one next step?` : "What's true and what's one next step?";
}

/** `?capture=<id>` / `?id=<record id>` from a location search string. Pure. */
export function startParams(search: string): { capture: string | null; id: string | null } {
  const q = new URLSearchParams(search);
  return { capture: q.get('capture') || null, id: q.get('id') || null };
}

export interface CaptureRef {
  id: string;
  text: string;
  story_id: string | null;
}

/** A capture from `ch01.captures_recent` by id, or undefined (absent, too old, or ch01 inactive). Pure. */
export function findCapture(s: Signals, id: string | null): CaptureRef | undefined {
  if (!id) return undefined;
  for (const v of signalList(s, 'ch01.captures_recent')) {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) continue;
    const o = v as { readonly [k: string]: SignalValue };
    if (o.id === id && typeof o.text === 'string') {
      return { id, text: o.text, story_id: typeof o.story_id === 'string' ? o.story_id : null };
    }
  }
  return undefined;
}

/** Empty form values (a record not yet started). */
export function emptyFields(): FormFields {
  return {
    situation: '',
    automatic_thought: '',
    feeling: '',
    intensity_before: null,
    evidence_for: '',
    evidence_against: '',
    ps_permanent: 0,
    ps_pervasive: 0,
    ps_personal: 0,
    balanced_thought: '',
    intensity_after: null,
  };
}

/** The editable fields of a stored record. Pure. */
export function fieldsOf(r: ThoughtRecord): FormFields {
  const f = emptyFields();
  for (const k of Object.keys(f) as (keyof FormFields)[]) (f as Record<string, unknown>)[k] = r[k];
  return f;
}

/** Fields whose value differs between two snapshots (what autosave must write). Pure. */
export function changedFields(saved: FormFields, now: FormFields): Partial<FormFields> {
  const out: Partial<FormFields> = {};
  for (const k of Object.keys(now) as (keyof FormFields)[]) {
    if (saved[k] !== now[k]) (out as Record<string, unknown>)[k] = now[k];
  }
  return out;
}

/** True once anything has been typed or toggled (a blank form is not saved). Pure. */
export function hasContent(f: FormFields): boolean {
  return Object.values(changedFields(emptyFields(), f)).some((v) => (typeof v === 'string' ? v.trim() !== '' : true));
}

/** Whether a step has something in it (the margin's step list marks it). Pure. */
export function stepFilled(key: StepKey, f: FormFields): boolean {
  switch (key) {
    case 'situation':
      return f.situation.trim() !== '';
    case 'thought':
      return f.automatic_thought.trim() !== '';
    case 'feeling':
      return f.feeling.trim() !== '' && f.intensity_before !== null;
    case 'evidence_for':
      return f.evidence_for.trim() !== '';
    case 'evidence_against':
      return f.evidence_against.trim() !== '';
    case 'three_ps':
      return f.ps_permanent + f.ps_pervasive + f.ps_personal > 0;
    case 'balanced':
      return f.balanced_thought.trim() !== '';
    case 'after':
      return f.intensity_after !== null;
  }
}

/** The steps a record still needs to count as complete (ii, iii, viii), in order. Pure. */
export function missingForComplete(f: FormFields): StepDef[] {
  return STEPS.filter((s) => (s.key === 'thought' || s.key === 'feeling' || s.key === 'after') && !stepFilled(s.key, f));
}
