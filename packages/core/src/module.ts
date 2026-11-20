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
  /** What reading the chapter adds to the app, one short line each (Library detail). */
  adds?: string[];
}

export interface ScreenDef<C> {
  /** Relative to `/m/<id>/`; the shell mounts it. */
  path: string;
  title: string;
  component: C;
  inNav: boolean;
  /** Sidebar icon name from `@mindwell/ui` (`Icon`); unknown names show a plain dot. */
  icon?: string;
  /** Pure. The number shown after the nav label (e.g. active experiments), or null for none. */
  navCount?: (signals: Signals) => number | null;
  /** The screen shows "Why this exists" in its own opener (`WhyLink`); the shell then adds none. */
  whyInOpener?: boolean;
}

/** Where a Today card sits. `margin`: a short note in Today's "In the margin" column. */
export type TodaySlot = 'morning' | 'anytime' | 'evening' | 'margin';

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
  /** Position within the slot, ascending (default 0); ties keep registry order. */
  order?: number;
}

export interface ReviewSectionDef<C> {
  id: string;
  title: string;
  component: C;
  order: number;
}

/** Inputs a module reminder may read. Plain data plus the module's own tables. */
export interface ReminderContext {
  /** Read-only use. */
  store: Store;
  /** ISO timestamp the check runs at. */
  now: string;
  /** Local day (`YYYY-MM-DD`, 04:00 boundary) of `now`. */
  day: string;
  /** The user's morning check-in time, `HH:MM` (Settings). */
  morning: string;
}

/** One notification a module wants shown while a mindwell tab is open. */
export interface ModuleReminder {
  /** Stable and unique: shown at most once per key. Namespaced, e.g. `'ch03.event:<id>:<starts_at>:pre'`. */
  key: string;
  /** ISO: due from this moment. */
  at: string;
  /** ISO: never shown at or after this moment (e.g. the event's start). */
  until: string;
  title: string;
  body: string;
}

export interface ReminderDef {
  id: string;
  /** Reads only the module's own tables. Should return only reminders whose `until` is after `now`. */
  compute(ctx: ReminderContext): Promise<ModuleReminder[]>;
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
  /** Optional: time-based notifications (the app fires them; modules never touch the browser). */
  reminders?: ReminderDef[];
}
