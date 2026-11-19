/**
 * Prompt selection (PROMPTS.md). Everything here is pure: same input, same output.
 */
import type { Module } from './module';
import type { PromptDef, PromptKind, Signals } from './prompts';
import type { PromptSlot } from './records';
import { activeModules } from './registry';
import { daysBetween } from './dates';
import { CORE_SIGNALS, signalList, signalString } from './signals';
import { FALLBACK_INTENT_ID, FALLBACK_JOURNAL_ID, corePrompts } from './core-prompts';

export interface PromptStats {
  rated: number;
  useful: number;
}

export interface SlotRules {
  /** Pick an intent prompt. */
  intent: boolean;
  /** Max journal prompts. */
  journalMax: number;
  /** Use the core default prompts when nothing qualifies. */
  fallbacks: boolean;
}

export const SLOT_RULES: Readonly<Record<PromptSlot, SlotRules>> = {
  morning: { intent: true, journalMax: 3, fallbacks: true },
  evening: { intent: false, journalMax: 1, fallbacks: false },
};

export const NOVELTY_BONUS = 1.25;
export const JITTER_MIN = 0.9;
export const JITTER_MAX = 1.1;

/** Fallback-only prompts: shown only when nothing else qualifies, never regular candidates. */
const FALLBACK_IDS: ReadonlySet<string> = new Set([FALLBACK_INTENT_ID, FALLBACK_JOURNAL_ID]);

export interface SelectionInput {
  slot: PromptSlot;
  /** Local day of the pick. */
  day: string;
  /** Core prompts + active modules' prompts; build with `promptLibrary`. */
  prompts: readonly PromptDef[];
  signals: Signals;
  /** Prompt id → last local day it was shown (from `prompts_shown`, swapped-out ones included). */
  lastShown: Readonly<Record<string, string>>;
  /** Prompt id → feedback totals (from `prompt_scores`). Missing = 0 rated. */
  stats: Readonly<Record<string, PromptStats>>;
}

export interface PickedPrompt {
  prompt: PromptDef;
  /** Text with placeholders filled. */
  text: string;
  score: number;
  /** True if it is the core default used because nothing else qualified. */
  fallback: boolean;
}

export interface Selection {
  intent: PickedPrompt | null;
  journal: PickedPrompt[];
}

/** Core prompts plus the prompts of modules whose chapter is read. Inactive modules contribute nothing. */
export function promptLibrary(modules: readonly Module<unknown>[], readChapters: Iterable<number>): PromptDef[] {
  return [...corePrompts, ...activeModules(modules, readChapters).flatMap((m) => m.prompts)];
}

/** `(useful + 1) / (rated + 2) * 2`: Laplace-smoothed, 0–2, starts at 1. */
export function usefulness(stats: PromptStats | undefined): number {
  const rated = Math.max(0, stats?.rated ?? 0);
  const useful = Math.min(rated, Math.max(0, stats?.useful ?? 0));
  return ((useful + 1) / (rated + 2)) * 2;
}

/** Deterministic factor in [0.9, 1.1] from `day + promptId`: stable within a day, varies across days. */
export function jitter(day: string, promptId: string): number {
  const r = mulberry32(fnv1a(`${day}|${promptId}`))();
  return JITTER_MIN + (JITTER_MAX - JITTER_MIN) * r;
}

/** Whole days since the prompt was last shown; Infinity if never. A future date counts as 0. */
export function daysSinceShown(lastShown: Readonly<Record<string, string>>, promptId: string, day: string): number {
  const last = lastShown[promptId];
  return last === undefined ? Infinity : Math.max(0, daysBetween(last, day));
}

/**
 * Fills `{placeholder}`s: `{name}` from `user.name`, the rest from `prompt.fill(signals)`.
 * Returns null if `fill` returns null or any placeholder stays unresolved.
 */
export function renderPrompt(prompt: PromptDef, signals: Signals): string | null {
  const values: Record<string, string | number> = {};
  const name = signalString(signals, CORE_SIGNALS.userName);
  if (name !== undefined) values.name = name;
  if (prompt.fill) {
    const filled = safe(() => prompt.fill!(signals), null);
    if (filled === null) return null;
    Object.assign(values, filled);
  }
  let missing = false;
  const text = prompt.text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key];
    if (v === undefined || v === '') {
      missing = true;
      return '';
    }
    return String(v);
  });
  return missing ? null : text;
}

/** Score for a prompt (assumed eligible): `weight * usefulness * novelty * jitter`. */
export function scorePrompt(prompt: PromptDef, input: Pick<SelectionInput, 'day' | 'signals' | 'stats'>): number {
  const recent = signalList(input.signals, CORE_SIGNALS.recentlyUnlocked);
  const novelty = recent.includes(prompt.module) ? NOVELTY_BONUS : 1;
  return prompt.weight * usefulness(input.stats[prompt.id]) * novelty * jitter(input.day, prompt.id);
}

/**
 * Candidates for the slot, best first: `when` matches or is `anytime`, condition true,
 * out of cooldown, placeholders resolvable, not fallback-only. Ties break by id.
 */
export function candidates(input: SelectionInput, kind: PromptKind): PickedPrompt[] {
  const picked: PickedPrompt[] = [];
  for (const p of input.prompts) {
    if (p.kind !== kind || FALLBACK_IDS.has(p.id)) continue;
    if (p.when !== input.slot && p.when !== 'anytime') continue;
    if (!safe(() => p.condition(input.signals), false)) continue;
    if (daysSinceShown(input.lastShown, p.id, input.day) < p.cooldownDays) continue;
    const text = renderPrompt(p, input.signals);
    if (text === null) continue;
    picked.push({ prompt: p, text, score: scorePrompt(p, input), fallback: false });
  }
  return picked.sort((a, b) => b.score - a.score || (a.prompt.id < b.prompt.id ? -1 : a.prompt.id > b.prompt.id ? 1 : 0));
}

/**
 * Morning: the top intent prompt, then up to 3 journal prompts in score order,
 * at most one per technique (the intent's technique counts). Core defaults fill in
 * when nothing qualifies. Evening: at most 1 journal prompt, no intent, no fallback.
 */
export function selectPrompts(input: SelectionInput): Selection {
  const rules = SLOT_RULES[input.slot];

  let intent: PickedPrompt | null = null;
  if (rules.intent) {
    intent = candidates(input, 'intent')[0] ?? (rules.fallbacks ? fallback(input, FALLBACK_INTENT_ID) : null);
  }

  const techniques = new Set<string>(intent ? [intent.prompt.technique] : []);
  const journal: PickedPrompt[] = [];
  for (const c of candidates(input, 'journal')) {
    if (journal.length >= rules.journalMax) break;
    if (techniques.has(c.prompt.technique)) continue;
    techniques.add(c.prompt.technique);
    journal.push(c);
  }
  if (journal.length === 0 && rules.fallbacks && rules.journalMax > 0) {
    const f = fallback(input, FALLBACK_JOURNAL_ID);
    if (f) journal.push(f);
  }

  return { intent, journal };
}

/**
 * "Show another": replaces the prompt `replaceId` with the next eligible one of the
 * same kind (same rules), skipping prompts already on screen or in `seen` (ids shown
 * in this slot today, swapped-out ones included). The swapped-out prompt still counts
 * as shown. Returns null if there is no other eligible prompt.
 */
export function showAnother(
  input: SelectionInput,
  current: Selection,
  replaceId: string,
  seen: readonly string[] = [],
): { selection: Selection; replaced: PickedPrompt; next: PickedPrompt } | null {
  const onScreen = [...(current.intent ? [current.intent] : []), ...current.journal];
  const replaced = onScreen.find((p) => p.prompt.id === replaceId);
  if (!replaced) return null;

  const exclude = new Set([...seen, ...onScreen.map((p) => p.prompt.id)]);
  const otherTechniques = new Set(onScreen.filter((p) => p !== replaced).map((p) => p.prompt.technique));
  const kind = replaced.prompt.kind;
  const next = candidates(input, kind).find(
    (c) => !exclude.has(c.prompt.id) && !otherTechniques.has(c.prompt.technique),
  );
  if (!next) return null;

  const selection: Selection =
    kind === 'intent'
      ? { intent: next, journal: current.journal }
      : { intent: current.intent, journal: current.journal.map((p) => (p === replaced ? next : p)) };
  return { selection, replaced, next };
}

function fallback(input: SelectionInput, id: string): PickedPrompt | null {
  const p = input.prompts.find((x) => x.id === id);
  if (!p) return null;
  const text = renderPrompt(p, input.signals);
  return text === null ? null : { prompt: p, text, score: scorePrompt(p, input), fallback: true };
}

function safe<T>(fn: () => T, onError: T): T {
  try {
    return fn();
  } catch {
    return onError;
  }
}

/** 32-bit FNV-1a hash. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small seeded PRNG; returns floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
