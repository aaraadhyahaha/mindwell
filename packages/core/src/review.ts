/** Weekly review: the week's core summary and suggestion handling (`suggestions`). */
import type { Module } from './module';
import type { Signals, Suggestion } from './prompts';
import type { DayRecord, IntentResult, SuggestionRecord } from './records';
import type { Store } from './store';
import { CORE_TABLES } from './records';
import { addDays } from './dates';

/** Days in a weekly review. */
export const REVIEW_DAYS = 7;

/** The `REVIEW_DAYS` local days ending on `day`, oldest first. Pure. */
export function reviewWeek(day: string): string[] {
  return Array.from({ length: REVIEW_DAYS }, (_, i) => addDays(day, i - (REVIEW_DAYS - 1)));
}

export interface WeekSummary {
  /** Days with a finished morning check-in. */
  checkins: number;
  /** Days with a finished evening close. */
  closes: number;
  intents: Record<IntentResult, number>;
  /** Mean day rating over rated days, or null if none. */
  meanRating: number | null;
  /** Rating per day of the week, oldest first; null where not rated. */
  ratings: (number | null)[];
}

/** Core's summary of the week ending on `day`, from its `days` rows (others are ignored). Pure. */
export function weekSummary(day: string, rows: readonly Pick<DayRecord, 'day' | 'rating' | 'intent_result' | 'checkin_at' | 'closed_at'>[]): WeekSummary {
  const week = reviewWeek(day);
  const byDay = new Map(rows.filter((r) => week.includes(r.day)).map((r) => [r.day, r]));
  const intents: Record<IntentResult, number> = { kept: 0, partly: 0, not: 0 };
  let checkins = 0;
  let closes = 0;
  const ratings = week.map((d) => {
    const r = byDay.get(d);
    if (!r) return null;
    if (r.checkin_at) checkins++;
    if (r.closed_at) closes++;
    if (r.intent_result) intents[r.intent_result]++;
    return typeof r.rating === 'number' ? r.rating : null;
  });
  const rated = ratings.filter((x): x is number => x !== null);
  const meanRating = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
  return { checkins, closes, intents, meanRating, ratings };
}

export interface ProposedSuggestion extends Suggestion {
  rule_id: string;
  module: string;
}

export interface SuggestionEvaluation {
  proposed: ProposedSuggestion[];
  /** Rules whose evaluate() threw; they propose nothing. */
  failed: { module: string; rule_id: string; error: unknown }[];
}

/**
 * Runs every active module's suggestion rules. Skips keys in `excludeKeys`
 * (already open, accepted or dismissed) and duplicate keys within the run
 * (first rule in module order wins). Pure over its inputs.
 */
export function evaluateSuggestions(
  active: readonly Module<unknown>[],
  signals: Signals,
  day: string,
  excludeKeys: ReadonlySet<string>,
): SuggestionEvaluation {
  const proposed: ProposedSuggestion[] = [];
  const failed: SuggestionEvaluation['failed'] = [];
  const seen = new Set(excludeKeys);
  for (const m of active) {
    for (const rule of m.suggestions) {
      let s: Suggestion | null;
      try {
        s = rule.evaluate(signals, { day });
      } catch (error) {
        failed.push({ module: m.manifest.id, rule_id: rule.id, error });
        continue;
      }
      if (!s || seen.has(s.key)) continue;
      seen.add(s.key);
      proposed.push({ ...s, rule_id: rule.id, module: m.manifest.id });
    }
  }
  return { proposed, failed };
}

export interface ReviewSuggestionsOptions {
  store: Store;
  /** Local day of the review. */
  day: string;
  /** Active modules only. */
  active: readonly Module<unknown>[];
  signals: Signals;
}

/**
 * Evaluates the rules, stores new proposals as `open`, and returns every open
 * suggestion (older open ones included), oldest first. A key that was ever
 * accepted or dismissed, or is already open, is not stored again.
 */
export async function reviewSuggestions(
  opts: ReviewSuggestionsOptions,
): Promise<{ open: SuggestionRecord[]; failed: SuggestionEvaluation['failed'] }> {
  const { store, day, active, signals } = opts;
  return store.transaction(async (tx) => {
    const existing = await tx.list<SuggestionRecord>(CORE_TABLES.suggestions);
    const { proposed, failed } = evaluateSuggestions(active, signals, day, new Set(existing.map((r) => r.key)));
    for (const p of proposed) {
      await tx.insert<SuggestionRecord>(CORE_TABLES.suggestions, {
        rule_id: p.rule_id,
        module: p.module,
        key: p.key,
        text: p.text,
        reason: p.reason,
        day,
        status: 'open',
        decided_at: null,
      });
    }
    const open = await tx.list<SuggestionRecord>(CORE_TABLES.suggestions, {
      where: { status: 'open' },
      orderBy: { column: 'id' },
    });
    return { open, failed };
  });
}

/** Accepts or dismisses an open suggestion. Nothing else changes: modules read accepted keys themselves. */
export async function decideSuggestion(
  store: Store,
  id: string,
  status: 'accepted' | 'dismissed',
  at: Date = new Date(),
): Promise<SuggestionRecord> {
  return store.update<SuggestionRecord>(CORE_TABLES.suggestions, id, { status, decided_at: at.toISOString() });
}
