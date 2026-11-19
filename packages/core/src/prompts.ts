import type { Store } from './store';

/** A JSON-like value a signal can hold. */
export type SignalValue =
  | null
  | boolean
  | number
  | string
  | readonly SignalValue[]
  | { readonly [key: string]: SignalValue };

/**
 * Snapshot computed once when the check-in opens: `key → value` from every
 * active module's SignalDefs plus core's. Conditions and placeholders read only this.
 */
export type Signals = Readonly<Record<string, SignalValue>>;

export interface SignalContext {
  /** Read-only use: signals never write. */
  store: Store;
  /** Local day (`YYYY-MM-DD`, 04:00 boundary) the snapshot is for. */
  day: string;
  /** ISO 8601 UTC time the snapshot is taken. */
  now: string;
  /**
   * Signals computed before this one: core's (except `upcoming_events`, which is
   * gathered from modules afterwards) plus those of modules earlier in the registry.
   * A module may read another module's published signal here; an inactive or
   * later module's key is absent, so treat it as undefined.
   */
  signals: Signals;
}

export interface SignalDef {
  /** Namespaced by owner: `'<id>.<name>'`, e.g. `'ch02.records_this_week'`. */
  key: string;
  /** `undefined` means "not published" (e.g. it needs an inactive module's signal): the key is left out. */
  compute(ctx: SignalContext): Promise<SignalValue | undefined>;
}

export type PromptKind = 'intent' | 'journal';
export type PromptWhen = 'morning' | 'evening' | 'anytime';

export interface PromptDef {
  /** `'ch02.evidence_against'` */
  id: string;
  /** Owning module id, `'core'` for core prompts. */
  module: string;
  kind: PromptKind;
  when: PromptWhen;
  /** Groups similar prompts; at most one per technique per pick. */
  technique: string;
  /** May use `{name}`, `{story}`, `{event}`. */
  text: string;
  /** Base priority, default 1. */
  weight: number;
  /** Minimum days before showing again. */
  cooldownDays: number;
  /** Pure. */
  condition: (signals: Signals) => boolean;
  /**
   * Pure. Values for the text's placeholders other than `{name}` (core fills that
   * from `user.name`), read from signals only. Return null to skip the prompt.
   * A prompt whose text keeps an unresolved placeholder is not a candidate.
   */
  fill?: (signals: Signals) => Readonly<Record<string, string | number>> | null;
}

/** Inputs a suggestion rule may use besides signals. Plain data, so rules stay pure. */
export interface SuggestionContext {
  /** Local day of the weekly review. */
  day: string;
}

/** What a rule proposes at weekly review. Provisional: refined with the weekly review item. */
export interface Suggestion {
  /** Stable for the same proposal, so a dismissed one is not shown again. */
  key: string;
  text: string;
  /** One line on why it is suggested (which data). */
  reason: string;
}

export interface SuggestionRule {
  id: string;
  /** Pure over its inputs. */
  evaluate(signals: Signals, ctx: SuggestionContext): Suggestion | null;
}
