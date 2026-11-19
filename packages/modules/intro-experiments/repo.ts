import { addDays } from '@mindwell/core';
import type { Store } from '@mindwell/core';
import { LIMIT_MESSAGE, MAX_ACTIVE, validateHypothesis, validateLength, validateRating } from './schema';
import type { CheckinRecord, ExperimentRecord } from './schema';

const EXPERIMENTS = 'intro_experiments';
const CHECKINS = 'intro_checkins';

export class ExperimentLimitError extends Error {
  constructor() {
    super(LIMIT_MESSAGE);
    this.name = 'ExperimentLimitError';
  }
}

export function listExperiments(store: Store): Promise<ExperimentRecord[]> {
  return store.list<ExperimentRecord>(EXPERIMENTS, { orderBy: { column: 'start_day', direction: 'desc' } });
}

export function activeExperiments(store: Store): Promise<ExperimentRecord[]> {
  return store.list<ExperimentRecord>(EXPERIMENTS, {
    where: { status: 'active' },
    orderBy: { column: 'end_day' },
  });
}

export interface StartInput {
  module: string;
  technique: string;
  label: string;
  hypothesis: string;
  days: number;
  day: string;
}

export async function startExperiment(store: Store, input: StartInput): Promise<ExperimentRecord> {
  const hypothesis = input.hypothesis.trim();
  if (!validateHypothesis(hypothesis)) throw new Error('Hypothesis must be 1 to 200 characters.');
  if (!validateLength(input.days)) throw new Error('Length must be a whole number of days from 1 to 120.');
  return store.transaction(async (tx) => {
    const active = await activeExperiments(tx);
    if (active.length >= MAX_ACTIVE) throw new ExperimentLimitError();
    return tx.insert<ExperimentRecord>(EXPERIMENTS, {
      module: input.module,
      technique: input.technique,
      label: input.label,
      hypothesis,
      start_day: input.day,
      end_day: addDays(input.day, input.days - 1),
      status: 'active',
      verdict: null,
      note: null,
    });
  });
}

function appendNote(old: string | null, note: string): string | null {
  const n = note.trim();
  if (!n) return old;
  return old ? `${old}\n${n}` : n;
}

export async function setVerdict(
  store: Store,
  id: string,
  verdict: 'keep' | 'drop',
  note: string,
): Promise<ExperimentRecord> {
  return store.transaction(async (tx) => {
    const exp = await tx.get<ExperimentRecord>(EXPERIMENTS, id);
    if (!exp) throw new Error('Experiment not found.');
    return tx.update<ExperimentRecord>(EXPERIMENTS, id, { verdict, note: appendNote(exp.note, note), status: 'ended' });
  });
}

export async function extendExperiment(
  store: Store,
  id: string,
  extraDays: 7 | 14,
  note: string,
): Promise<ExperimentRecord> {
  return store.transaction(async (tx) => {
    const exp = await tx.get<ExperimentRecord>(EXPERIMENTS, id);
    if (!exp) throw new Error('Experiment not found.');
    return tx.update<ExperimentRecord>(EXPERIMENTS, id, {
      end_day: addDays(exp.end_day, extraDays),
      verdict: 'extend',
      status: 'active',
      note: appendNote(exp.note, note),
    });
  });
}

export function endEarly(store: Store, id: string, day: string): Promise<ExperimentRecord> {
  return store.update<ExperimentRecord>(EXPERIMENTS, id, { end_day: day });
}

export function listCheckins(store: Store, experimentId: string): Promise<CheckinRecord[]> {
  return store.list<CheckinRecord>(CHECKINS, {
    where: { experiment_id: experimentId },
    orderBy: [{ column: 'day' }, { column: 'created_at' }],
  });
}

export interface CheckinInput {
  experimentId: string;
  day: string;
  rating: number;
  note: string;
}

/** One check-in per experiment per review week: updates a row within the 7 days ending on `day`. */
export async function saveCheckin(store: Store, input: CheckinInput): Promise<CheckinRecord> {
  if (!validateRating(input.rating)) throw new Error('Rating must be a whole number from 1 to 5.');
  const note = input.note.trim() || null;
  return store.transaction(async (tx) => {
    const from = addDays(input.day, -6);
    const existing = (await listCheckins(tx, input.experimentId)).filter(
      (c) => c.day >= from && c.day <= input.day,
    );
    const last = existing[existing.length - 1];
    if (last) return tx.update<CheckinRecord>(CHECKINS, last.id, { day: input.day, rating: input.rating, note });
    return tx.insert<CheckinRecord>(CHECKINS, {
      experiment_id: input.experimentId,
      day: input.day,
      rating: input.rating,
      note,
    });
  });
}
