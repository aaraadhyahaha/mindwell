import type { BaseRecord, SignalDef, SignalValue, Signals, Store } from '@mindwell/core';
import { addDays, daysBetween, signalNumber } from '@mindwell/core';

/** The experiment fields signals read (structural, so tests can pass plain objects). */
export interface ExperimentRow {
  id: string;
  module: string;
  technique: string;
  label: string;
  start_day: string;
  end_day: string;
  status: string;
}

export interface CheckinRow {
  experiment_id: string;
  day: string;
  rating: number;
}

export interface ActiveEntry {
  id: string;
  module: string;
  technique: string;
  label: string;
  start_day: string;
  end_day: string;
  days_left: number;
  /** Up to the last 2 check-in ratings, oldest first. */
  recent_ratings: number[];
}

export interface IntroSignalValues {
  active: ActiveEntry[];
  ending_within_3d: boolean;
  awaiting_verdict: number;
  verdict_due: { id: string; technique: string; label: string }[];
  midpoint_today: string | null;
  modules_tried: string[];
}

/** Midpoint day: `start + floor((end − start) / 2)`. Pure. */
export function midpoint(start: string, end: string): string {
  return addDays(start, Math.floor(daysBetween(start, end) / 2));
}

/** Every intro signal value from live rows. Pure. */
export function introSignalValues(experiments: readonly ExperimentRow[], checkins: readonly CheckinRow[], day: string): IntroSignalValues {
  const running = experiments.filter((e) => e.status === 'active').sort((a, b) => a.end_day.localeCompare(b.end_day));
  const active = running.map((e) => ({
    id: e.id,
    module: e.module,
    technique: e.technique,
    label: e.label,
    start_day: e.start_day,
    end_day: e.end_day,
    days_left: daysBetween(day, e.end_day),
    recent_ratings: checkins
      .filter((c) => c.experiment_id === e.id)
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-2)
      .map((c) => c.rating),
  }));
  const due = running.filter((e) => e.end_day <= day);
  return {
    active,
    ending_within_3d: active.some((e) => e.days_left >= 0 && e.days_left <= 3),
    awaiting_verdict: due.length,
    verdict_due: due.map((e) => ({ id: e.id, technique: e.technique, label: e.label })),
    midpoint_today: running.find((e) => e.end_day > day && midpoint(e.start_day, e.end_day) === day)?.label ?? null,
    modules_tried: [...new Set(experiments.map((e) => e.module))].sort(),
  };
}

async function load(store: Store, day: string): Promise<IntroSignalValues> {
  const [experiments, checkins] = await Promise.all([
    store.list<ExperimentRow & BaseRecord>('intro_experiments'),
    store.list<CheckinRow & BaseRecord>('intro_checkins'),
  ]);
  return introSignalValues(experiments, checkins, day);
}

function def(name: keyof IntroSignalValues): SignalDef {
  return {
    key: `intro.${name}`,
    async compute({ store, day }) {
      return (await load(store, day))[name] as unknown as SignalValue;
    },
  };
}

export const signals: SignalDef[] = [
  def('active'),
  def('ending_within_3d'),
  def('awaiting_verdict'),
  def('verdict_due'),
  def('midpoint_today'),
  def('modules_tried'),
];

/** Today card (morning) visibility: an experiment awaits a verdict. Pure. */
export const verdictCardVisible = (s: Signals): boolean => (signalNumber(s, 'intro.awaiting_verdict') ?? 0) > 0;
