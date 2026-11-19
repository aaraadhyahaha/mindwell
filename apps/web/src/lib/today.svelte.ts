import type { Component } from 'svelte';
import type {
  DayRecord,
  IntentResult,
  PromptShownRecord,
  PromptSlot,
  RecordPatch,
  Selection,
  Signals,
  Store,
  TodaySlot,
} from '@mindwell/core';
import {
  CORE_TABLES,
  addDays,
  buildSignals,
  loadPromptHistory,
  localDay,
  parseDayTypes,
  promptLibrary,
  recordShown,
  recordSwap,
  selectPrompts,
  setFeedback,
  shownInSlot,
  showAnother,
} from '@mindwell/core';
import type { SelectionInput } from '@mindwell/core';
import { activation } from './activation.svelte';
import { getStore } from './db';
import { modules } from './registry';
import { contextLines, selectionFromRows } from './today';

export type Feedback = 'useful' | 'not-useful';

export interface ShownPrompt {
  promptId: string;
  rowId: string;
  text: string;
  feedback: Feedback | null;
  /** Owning module id (`'core'` for core prompts), for the source line. */
  module: string;
}

const EMPTY: Selection = { intent: null, journal: [] };

/** Orchestrates the Today page: Store calls, selection, signals. The page only renders. */
export class TodayState {
  day = $state(localDay(new Date()));
  store = $state.raw<Store | null>(null);
  signals = $state.raw<Signals>({});
  dayRow = $state.raw<DayRecord | null>(null);
  /** Yesterday's day row, for the margin. */
  yesterday = $state.raw<DayRecord | null>(null);
  context = $state.raw<string[]>([]);
  error = $state<string | null>(null);
  busy = $state(false);

  // Form values
  types = $state<string[]>([]);
  energy = $state<number | null>(null);
  intentText = $state('');
  intentResult = $state<IntentResult | null>(null);
  rating = $state<number | null>(null);

  morningEditing = $state(false);
  eveningRevealed = $state(false);
  eveningEditing = $state(false);

  private selections = $state.raw<Record<PromptSlot, Selection>>({ morning: EMPTY, evening: EMPTY });
  private rows = $state.raw<Record<PromptSlot, Record<string, PromptShownRecord>>>({ morning: {}, evening: {} });
  noOther = $state<Record<string, boolean>>({});

  morningStage = $derived.by<'basics' | 'prompts' | 'summary'>(() => {
    if (this.morningEditing) return 'basics';
    if (this.dayRow?.checkin_at) return 'summary';
    return this.selections.morning.intent || this.selections.morning.journal.length > 0 ? 'prompts' : 'basics';
  });

  hasEveningData = $derived(
    !!this.dayRow && (this.dayRow.rating !== null || this.dayRow.intent_result !== null || this.dayRow.closed_at !== null),
  );

  eveningStage = $derived.by<'basics' | 'finish' | 'summary'>(() => {
    if (this.eveningEditing) return 'basics';
    if (this.dayRow?.closed_at) return 'summary';
    return this.dayRow?.rating != null ? 'finish' : 'basics';
  });

  private get readNumbers(): number[] {
    return activation.read.map((r) => r.chapter);
  }

  // ---- Load ----

  /** If the local day changed (app left open past 04:00), starts the new day fresh. */
  async rollover(now: Date = new Date()): Promise<void> {
    const d = localDay(now);
    if (d === this.day) return;
    this.day = d;
    this.selections = { morning: EMPTY, evening: EMPTY };
    this.rows = { morning: {}, evening: {} };
    this.noOther = {};
    this.morningEditing = false;
    this.eveningRevealed = false;
    this.eveningEditing = false;
    this.context = [];
    await this.load();
  }

  async load(): Promise<void> {
    try {
      if (!activation.loaded) await activation.load();
      const store = await getStore();
      this.store = store;
      await this.refreshDay(store);
      await this.refreshSignals(store);
      const library = promptLibrary(modules, this.readNumbers);
      const [m, e] = await Promise.all([shownInSlot(store, this.day, 'morning'), shownInSlot(store, this.day, 'evening')]);
      this.applyRows('morning', m, library);
      this.applyRows('evening', e, library);
      this.context = await this.loadContext(store);
    } catch {
      this.error = 'Could not load today. Please try again.';
    }
  }

  private applyRows(slot: PromptSlot, rows: PromptShownRecord[], library: ReturnType<typeof promptLibrary>): void {
    this.selections = { ...this.selections, [slot]: selectionFromRows(rows, library) };
    const byPrompt: Record<string, PromptShownRecord> = {};
    for (const r of rows) if (r.replaced === 0) byPrompt[r.prompt_id] = r;
    this.rows = { ...this.rows, [slot]: byPrompt };
  }

  private async refreshDay(store: Store): Promise<void> {
    const [row] = await store.list<DayRecord>(CORE_TABLES.days, { where: { day: this.day }, limit: 1 });
    this.setDayRow(row ?? null);
  }

  private setDayRow(row: DayRecord | null): void {
    this.dayRow = row;
    this.types = parseDayTypes(row?.types);
    this.energy = row?.energy ?? null;
    this.intentText = row?.intent_text ?? '';
    this.intentResult = row?.intent_result ?? null;
    this.rating = row?.rating ?? null;
  }

  private async refreshSignals(store: Store): Promise<void> {
    const { signals } = await buildSignals({ store, day: this.day, active: activation.active, chapters: activation.read });
    this.signals = signals;
  }

  private async loadContext(store: Store): Promise<string[]> {
    const [y] = await store.list<DayRecord>(CORE_TABLES.days, { where: { day: addDays(this.day, -1) }, limit: 1 });
    this.yesterday = y ?? null;
    return contextLines(this.signals, y ? { intent_text: y.intent_text, intent_result: y.intent_result } : null);
  }

  // ---- Helpers ----

  private async guard(fn: (store: Store) => Promise<void>): Promise<boolean> {
    if (!this.store) return false;
    this.busy = true;
    this.error = null;
    try {
      await fn(this.store);
      return true;
    } catch {
      this.error = 'Could not save that. Please try again.';
      return false;
    } finally {
      this.busy = false;
    }
  }

  private async upsertDay(store: Store, patch: RecordPatch<DayRecord>): Promise<DayRecord> {
    const [row] = await store.list<DayRecord>(CORE_TABLES.days, { where: { day: this.day }, limit: 1 });
    const saved = row
      ? await store.update<DayRecord>(CORE_TABLES.days, row.id, patch)
      : await store.insert<DayRecord>(CORE_TABLES.days, {
          day: this.day,
          types: '[]',
          energy: null,
          intent_prompt_id: null,
          intent_text: null,
          intent_result: null,
          rating: null,
          checkin_at: null,
          closed_at: null,
          ...patch,
        });
    this.dayRow = saved;
    return saved;
  }

  private async input(store: Store, slot: PromptSlot): Promise<SelectionInput> {
    const { lastShown, stats } = await loadPromptHistory(store);
    return {
      slot,
      day: this.day,
      prompts: promptLibrary(modules, this.readNumbers),
      signals: this.signals,
      lastShown,
      stats,
    };
  }

  /** Picks and records the slot's prompts, unless the slot already has rows. */
  private async pickIfNone(store: Store, slot: PromptSlot): Promise<void> {
    const existing = await shownInSlot(store, this.day, slot);
    if (existing.length > 0) {
      this.applyRows(slot, existing, promptLibrary(modules, this.readNumbers));
      return;
    }
    const selection = selectPrompts(await this.input(store, slot));
    const picks = [...(selection.intent ? [selection.intent] : []), ...selection.journal];
    const recorded: PromptShownRecord[] = [];
    for (const [i, p] of picks.entries()) recorded.push(await recordShown(store, this.day, slot, p, i));
    this.selections = { ...this.selections, [slot]: selection };
    this.rows = { ...this.rows, [slot]: Object.fromEntries(recorded.map((r) => [r.prompt_id, r])) };
    if (selection.intent) await this.upsertDay(store, { intent_prompt_id: selection.intent.prompt.id });
  }

  // ---- Morning ----

  async saveMorningBasics(): Promise<void> {
    if (this.energy === null) return;
    await this.guard(async (store) => {
      await this.upsertDay(store, { types: JSON.stringify(this.types), energy: this.energy });
      await this.refreshSignals(store);
      await this.pickIfNone(store, 'morning');
      this.morningEditing = false;
    });
  }

  async saveIntent(): Promise<void> {
    const text = this.intentText.trim();
    if (!this.store || text === (this.dayRow?.intent_text ?? '')) return;
    await this.guard(async (store) => {
      await this.upsertDay(store, { intent_text: text || null });
    });
  }

  async doneMorning(): Promise<void> {
    await this.guard(async (store) => {
      const text = this.intentText.trim();
      await this.upsertDay(store, { intent_text: text || null, checkin_at: new Date().toISOString() });
    });
  }

  // ---- Evening ----

  async saveEveningBasics(): Promise<void> {
    await this.guard(async (store) => {
      const hasIntent = !!this.dayRow?.intent_text;
      await this.upsertDay(store, { intent_result: hasIntent ? this.intentResult : null, rating: this.rating });
      await this.refreshSignals(store);
      await this.pickIfNone(store, 'evening');
      this.eveningEditing = false;
    });
  }

  async closeDay(): Promise<void> {
    await this.guard(async (store) => {
      await this.upsertDay(store, { closed_at: new Date().toISOString() });
    });
  }

  // ---- Prompts ----

  intentPrompt(slot: PromptSlot): ShownPrompt | null {
    const p = this.selections[slot].intent;
    return p ? this.shown(slot, p.prompt.id, p.text, p.prompt.module) : null;
  }

  journalPrompts(slot: PromptSlot): ShownPrompt[] {
    return this.selections[slot].journal.map((p) => this.shown(slot, p.prompt.id, p.text, p.prompt.module));
  }

  private shown(slot: PromptSlot, promptId: string, text: string, module: string): ShownPrompt {
    const row = this.rows[slot][promptId];
    return {
      promptId,
      rowId: row?.id ?? '',
      text,
      feedback: row?.feedback === 'useful' ? 'useful' : row?.feedback === 'not_useful' ? 'not-useful' : null,
      module,
    };
  }

  async rate(slot: PromptSlot, promptId: string, f: Feedback): Promise<void> {
    const row = this.rows[slot][promptId];
    if (!row) return;
    const core = f === 'useful' ? 'useful' : 'not_useful';
    await this.guard(async (store) => {
      await setFeedback(store, row.id, core);
      this.rows = { ...this.rows, [slot]: { ...this.rows[slot], [promptId]: { ...row, feedback: core } } };
    });
  }

  async another(slot: PromptSlot, promptId: string): Promise<void> {
    const row = this.rows[slot][promptId];
    if (!row) return;
    await this.guard(async (store) => {
      const seen = (await shownInSlot(store, this.day, slot)).map((r) => r.prompt_id);
      const result = showAnother(await this.input(store, slot), this.selections[slot], promptId, seen);
      if (!result) {
        this.noOther = { ...this.noOther, [promptId]: true };
        return;
      }
      const newRow = await recordSwap(store, row.id, result.next);
      const { [promptId]: _gone, ...rest } = this.rows[slot];
      this.rows = { ...this.rows, [slot]: { ...rest, [result.next.prompt.id]: newRow } };
      this.selections = { ...this.selections, [slot]: result.selection };
      if (result.replaced.prompt.kind === 'intent') {
        await this.upsertDay(store, { intent_prompt_id: result.next.prompt.id });
      }
    });
  }

  // ---- Module cards ----

  cards(slot: TodaySlot): { key: string; order: number; component: Component<{ store: Store; day: string; signals: Signals }> }[] {
    return activation.active
      .flatMap((m) =>
        m.todayCards
          .filter((c) => c.slot === slot && safeVisible(c.visible, this.signals))
          .map((c) => ({ key: `${m.manifest.id}.${c.id}`, order: c.order ?? 0, component: c.component as Component<{ store: Store; day: string; signals: Signals }> })),
      )
      .sort((a, b) => a.order - b.order);
  }
}

function safeVisible(visible: (s: Signals) => boolean, signals: Signals): boolean {
  try {
    return visible(signals);
  } catch {
    return false;
  }
}

