import type { Migration, Store } from './store';
import type { PromptDef, SignalDef, Signals, SuggestionRule } from './prompts';

export interface ModuleManifest {
  /** `'ch02'`; also the table prefix and route segment. */
  id: string;
  /** Book chapter; Introduction = 0. */
  chapter: number;
  title: string;
  /** One line. */
  idea: string;
  /** 2–4 sentences. */
  evidence: string;
  references: string[];
}

export interface ScreenDef<C> {
  /** Relative to `/m/<id>/`; the shell mounts it. */
  path: string;
  title: string;
  component: C;
  inNav: boolean;
}

export type TodaySlot = 'morning' | 'anytime' | 'evening';

/** Props the shell passes to every module Today card and review section component. */
export interface ModuleViewProps {
  store: Store;
  /** Local day being shown (Today) or the last day of the reviewed week. */
  day: string;
  /** The snapshot the page computed; cards read it, never recompute it. */
  signals: Signals;
}

export interface TodayCardDef<C> {
  id: string;
  slot: TodaySlot;
  component: C;
  /** Pure. */
  visible: (signals: Signals) => boolean;
}

export interface ReviewSectionDef<C> {
  id: string;
  title: string;
  component: C;
  order: number;
}

export interface ExperimentDef {
  technique: string;
  label: string;
  defaultDays: number;
}

/**
 * Everything one chapter module exports. `C` is the UI component type; core
 * never imports Svelte, so the shell instantiates it (e.g. `Module<Component>`).
 */
export interface Module<C = unknown> {
  manifest: ModuleManifest;
  migrations: Migration[];
  screens: ScreenDef<C>[];
  todayCards: TodayCardDef<C>[];
  prompts: PromptDef[];
  signals: SignalDef[];
  reviewSections: ReviewSectionDef<C>[];
  suggestions: SuggestionRule[];
  experiments: ExperimentDef[];
}
