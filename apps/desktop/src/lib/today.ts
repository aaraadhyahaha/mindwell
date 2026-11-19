/** Pure helpers for the Today page (no Store, no Svelte). */
import type { IntentResult, PromptDef, PromptShownRecord, Selection, SignalValue, Signals } from '@mindwell/core';
import { CORE_SIGNALS, DAY_BOUNDARY_HOUR, FALLBACK_INTENT_ID, FALLBACK_JOURNAL_ID, signalList, signalNumber } from '@mindwell/core';

/** Evening form opens from this local hour. */
export const EVENING_OPENS_HOUR = 17;

/**
 * The evening form shows directly from 17:00 until the day boundary (04:00),
 * or at any time once there is evening data. Otherwise the user opens it with "Close now".
 */
export function isEveningOpen(now: Date, hasEveningData: boolean): boolean {
  if (hasEveningData) return true;
  const h = now.getHours();
  return h >= EVENING_OPENS_HOUR || h < DAY_BOUNDARY_HOUR;
}

/**
 * Rebuilds the on-screen selection from `prompts_shown` rows: not-replaced rows in
 * position order, prompts no longer in the library dropped, text as it was shown.
 */
export function selectionFromRows(rows: readonly PromptShownRecord[], library: readonly PromptDef[]): Selection {
  const live = rows
    .filter((r) => r.replaced === 0)
    .sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const result: Selection = { intent: null, journal: [] };
  for (const row of live) {
    const prompt = library.find((p) => p.id === row.prompt_id);
    if (!prompt) continue;
    const picked = {
      prompt,
      text: row.text,
      score: 0,
      fallback: prompt.id === FALLBACK_INTENT_ID || prompt.id === FALLBACK_JOURNAL_ID,
    };
    if (row.kind === 'intent') result.intent ??= picked;
    else result.journal.push(picked);
  }
  return result;
}

const RESULT_LABEL: Record<IntentResult, string> = { kept: 'kept', partly: 'partly', not: 'not today' };

export function intentResultLabel(r: IntentResult): string {
  return RESULT_LABEL[r];
}

/** One line for an upcoming-event signal value: a string as is, an object by `title` or `text`. */
export function eventLine(v: SignalValue): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    const t = (v as { readonly [k: string]: SignalValue })['title'] ?? (v as { readonly [k: string]: SignalValue })['text'];
    return typeof t === 'string' && t.trim() ? t.trim() : null;
  }
  return null;
}

/** Lines for the morning context strip. Never empty: falls back to "Nothing recorded yesterday." */
export function contextLines(
  signals: Signals,
  yesterday: { intent_text: string | null; intent_result: IntentResult | null } | null,
): string[] {
  const lines: string[] = [];
  const rating = signalNumber(signals, CORE_SIGNALS.yesterdayRating);
  if (rating !== undefined) lines.push(`Yesterday: ${rating} of 5`);
  const intent = yesterday?.intent_text?.trim();
  if (intent) {
    lines.push(
      yesterday?.intent_result ? `Yesterday's intent: ${intent} (${intentResultLabel(yesterday.intent_result)})` : `Yesterday's intent: ${intent}`,
    );
  }
  for (const v of signalList(signals, CORE_SIGNALS.upcomingEvents)) {
    const line = eventLine(v);
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : ['Nothing recorded yesterday.'];
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Thursday 19 November" for a `YYYY-MM-DD` day. */
export function dayHeading(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`;
}
