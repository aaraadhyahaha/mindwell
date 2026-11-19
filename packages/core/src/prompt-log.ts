/** Recording shown prompts and feedback (`prompts_shown`, `prompt_scores`). Store only. */
import type { Store } from './store';
import type { PromptFeedback, PromptScoreRecord, PromptShownRecord, PromptSlot } from './records';
import type { PickedPrompt, PromptStats } from './engine';
import { CORE_TABLES } from './records';

export interface PromptHistory {
  /** Prompt id → last day shown. */
  lastShown: Record<string, string>;
  stats: Record<string, PromptStats>;
}

/** Loads what `SelectionInput` needs from the log. */
export async function loadPromptHistory(store: Store): Promise<PromptHistory> {
  const [shown, scores] = await Promise.all([
    store.list<PromptShownRecord>(CORE_TABLES.promptsShown),
    store.list<PromptScoreRecord>(CORE_TABLES.promptScores),
  ]);
  const lastShown: Record<string, string> = {};
  for (const r of shown) {
    const prev = lastShown[r.prompt_id];
    if (prev === undefined || r.day > prev) lastShown[r.prompt_id] = r.day;
  }
  const stats: Record<string, PromptStats> = {};
  for (const s of scores) stats[s.prompt_id] = { rated: s.rated, useful: s.useful };
  return { lastShown, stats };
}

/** Prompts shown in a slot on a day, in screen order (swapped-out ones included, `replaced = 1`). */
export function shownInSlot(store: Store, day: string, slot: PromptSlot): Promise<PromptShownRecord[]> {
  return store.list<PromptShownRecord>(CORE_TABLES.promptsShown, {
    where: { day, slot },
    orderBy: [{ column: 'position' }, { column: 'id' }],
  });
}

/** Records one prompt put on screen. */
export function recordShown(
  store: Store,
  day: string,
  slot: PromptSlot,
  pick: PickedPrompt,
  position: number,
): Promise<PromptShownRecord> {
  return store.insert<PromptShownRecord>(CORE_TABLES.promptsShown, {
    day,
    slot,
    prompt_id: pick.prompt.id,
    module: pick.prompt.module,
    kind: pick.prompt.kind,
    technique: pick.prompt.technique,
    text: pick.text,
    position,
    replaced: 0,
    feedback: null,
  });
}

/**
 * "Show another": marks the shown row as swapped out (it still counts as shown
 * for cooldowns) and records the replacement at the same position.
 */
export async function recordSwap(store: Store, shownId: string, next: PickedPrompt): Promise<PromptShownRecord> {
  return store.transaction(async (tx) => {
    const old = await tx.get<PromptShownRecord>(CORE_TABLES.promptsShown, shownId);
    if (!old) throw new Error(`No shown prompt ${shownId}`);
    await tx.update<PromptShownRecord>(CORE_TABLES.promptsShown, shownId, { replaced: 1 });
    return recordShown(tx, old.day, old.slot, next, old.position);
  });
}

/**
 * Sets (or clears, with null) feedback on a shown prompt and keeps `prompt_scores`
 * in step: changing a rating moves the counts, it never double-counts.
 */
export async function setFeedback(store: Store, shownId: string, feedback: PromptFeedback | null): Promise<void> {
  await store.transaction(async (tx) => {
    const row = await tx.get<PromptShownRecord>(CORE_TABLES.promptsShown, shownId);
    if (!row) throw new Error(`No shown prompt ${shownId}`);
    const prev = row.feedback;
    if (prev === feedback) return;
    await tx.update<PromptShownRecord>(CORE_TABLES.promptsShown, shownId, { feedback });

    const dRated = (feedback ? 1 : 0) - (prev ? 1 : 0);
    const dUseful = (feedback === 'useful' ? 1 : 0) - (prev === 'useful' ? 1 : 0);
    const [score] = await tx.list<PromptScoreRecord>(CORE_TABLES.promptScores, {
      where: { prompt_id: row.prompt_id },
      limit: 1,
    });
    if (score) {
      await tx.update<PromptScoreRecord>(CORE_TABLES.promptScores, score.id, {
        rated: Math.max(0, score.rated + dRated),
        useful: Math.max(0, score.useful + dUseful),
      });
    } else {
      await tx.insert<PromptScoreRecord>(CORE_TABLES.promptScores, {
        prompt_id: row.prompt_id,
        rated: Math.max(0, dRated),
        useful: Math.max(0, dUseful),
      });
    }
  });
}
