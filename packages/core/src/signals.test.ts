import { describe, expect, it } from 'vitest';
import type { Module } from './module';
import type { Signals } from './prompts';
import type { Store } from './store';
import { CORE_SIGNALS, buildSignals, chaptersReadSignal, coreSignals, experimentsSignal } from './signals';

function mod(id: string, chapter: number, experiments: Module['experiments'] = []): Module {
  return {
    manifest: { id, chapter, title: id, idea: '', evidence: '', references: [] },
    migrations: [],
    screens: [],
    todayCards: [],
    prompts: [],
    signals: [],
    reviewSections: [],
    suggestions: [],
    experiments,
  };
}

describe('chaptersReadSignal', () => {
  it('lists given modules whose chapter is read, with the read day', () => {
    const active = [mod('intro', 0), mod('ch01', 1), mod('ch02', 2)];
    const read = [
      { chapter: 1, read_day: '2026-11-01' },
      { chapter: 0, read_day: '2026-10-30' },
    ];
    expect(chaptersReadSignal(active, read)).toEqual([
      { module: 'intro', chapter: 0, read_day: '2026-10-30' },
      { module: 'ch01', chapter: 1, read_day: '2026-11-01' },
    ]);
  });
});

describe('experimentsSignal', () => {
  it('flattens experiments with their module id', () => {
    const active = [mod('intro', 0), mod('ch01', 1, [{ technique: 'notice_name', label: 'Notice and name daily', defaultDays: 21 }])];
    expect(experimentsSignal(active)).toEqual([
      { module: 'ch01', technique: 'notice_name', label: 'Notice and name daily', default_days: 21 },
    ]);
  });
});

describe('coreSignals', () => {
  it('defaults the new lists to []', () => {
    const s = coreSignals({ today: null, yesterday: null, userName: null, recentlyUnlocked: [], upcomingEvents: [] });
    expect(s[CORE_SIGNALS.chaptersRead]).toEqual([]);
    expect(s[CORE_SIGNALS.experimentsAvailable]).toEqual([]);
  });
});

describe('buildSignals ctx.signals', () => {
  // Every table is empty: enough to exercise the ordering.
  const emptyStore = { list: async () => [] } as unknown as Store;

  it('gives each compute core signals and earlier modules\' keys, not later ones', async () => {
    const seen: Signals[] = [];
    const a = { ...mod('a', 1), signals: [{ key: 'a.x', compute: async () => 7 }] };
    const b = {
      ...mod('b', 2),
      signals: [
        { key: 'b.y', compute: async ({ signals }: { signals: Signals }) => (seen.push(signals), 1) },
        { key: 'b.z', compute: async ({ signals }: { signals: Signals }) => (seen.push(signals), 2) },
      ],
    };
    const { signals } = await buildSignals({ store: emptyStore, day: '2026-11-19', active: [a, b], chapters: [] });
    expect(seen[0]!['a.x']).toBe(7);
    expect(seen[0]!['b.z']).toBeUndefined();
    expect(seen[1]!['b.y']).toBe(1);
    expect(CORE_SIGNALS.userName in seen[0]!).toBe(true);
    expect(signals['b.z']).toBe(2);
  });
});
