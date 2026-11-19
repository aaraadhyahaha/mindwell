import type { Store } from '@mindwell/core';
import { isComplete, validateFeeling, validateIntensity100, validateText } from './schema';
import type { DraftPatch, ThoughtRecord } from './schema';

const TABLE = 'ch02_thought_records';

const TEXT_FIELDS = [
  'situation',
  'automatic_thought',
  'evidence_for',
  'evidence_against',
  'balanced_thought',
] as const;
const FLAG_FIELDS = ['ps_permanent', 'ps_pervasive', 'ps_personal'] as const;

function validatePatch(patch: DraftPatch): void {
  for (const k of TEXT_FIELDS) {
    const v = patch[k];
    if (v !== undefined && !validateText(v)) throw new Error('Text must be 2000 characters or fewer.');
  }
  if (patch.feeling !== undefined && !validateFeeling(patch.feeling)) {
    throw new Error('A feeling must be 40 characters or fewer.');
  }
  for (const k of ['intensity_before', 'intensity_after'] as const) {
    const v = patch[k];
    if (v !== undefined && !validateIntensity100(v)) throw new Error('Intensity must be a whole number from 0 to 100.');
  }
  for (const k of FLAG_FIELDS) {
    const v = patch[k];
    if (v !== undefined && v !== 0 && v !== 1) throw new Error('Three-Ps toggles must be 0 or 1.');
  }
}

/** Starts a record, or resumes the live record already started from the same capture. */
export async function startRecord(
  store: Store,
  input: { day: string; capture?: { id: string; text: string; story_id: string | null } | null },
): Promise<ThoughtRecord> {
  const capture = input.capture ?? null;
  return store.transaction(async (tx) => {
    if (capture) {
      const hit = (await tx.list<ThoughtRecord>(TABLE, { where: { capture_id: capture.id } }))[0];
      if (hit) return hit;
    }
    return tx.insert<ThoughtRecord>(TABLE, {
      day: input.day,
      capture_id: capture?.id ?? null,
      story_id: capture?.story_id ?? null,
      situation: '',
      automatic_thought: capture?.text ?? '',
      feeling: '',
      intensity_before: null,
      evidence_for: '',
      evidence_against: '',
      ps_permanent: 0,
      ps_pervasive: 0,
      ps_personal: 0,
      balanced_thought: '',
      intensity_after: null,
      complete: 0,
    });
  });
}

export async function saveDraft(store: Store, id: string, patch: DraftPatch): Promise<ThoughtRecord> {
  validatePatch(patch);
  return store.transaction(async (tx) => {
    const current = await tx.get<ThoughtRecord>(TABLE, id);
    if (!current) throw new Error('Thought record not found.');
    const merged = { ...current, ...patch };
    return tx.update<ThoughtRecord>(TABLE, id, { ...patch, complete: isComplete(merged) ? 1 : 0 });
  });
}

export function getRecord(store: Store, id: string): Promise<ThoughtRecord | null> {
  return store.get<ThoughtRecord>(TABLE, id);
}

/** All live records, newest first. */
export function listRecords(store: Store): Promise<ThoughtRecord[]> {
  return store.list<ThoughtRecord>(TABLE, { orderBy: { column: 'created_at', direction: 'desc' } });
}

/** Unfinished records, most recently edited first. */
export function listDrafts(store: Store): Promise<ThoughtRecord[]> {
  return store.list<ThoughtRecord>(TABLE, {
    where: { complete: 0 },
    orderBy: { column: 'updated_at', direction: 'desc' },
  });
}

/** Records with fromDay <= day <= toDay, oldest first. */
export async function recordsBetween(store: Store, fromDay: string, toDay: string): Promise<ThoughtRecord[]> {
  const all = await store.list<ThoughtRecord>(TABLE, { orderBy: { column: 'created_at' } });
  return all.filter((r) => r.day >= fromDay && r.day <= toDay);
}

export async function discardRecord(store: Store, id: string): Promise<void> {
  await store.softDelete(TABLE, id);
}
