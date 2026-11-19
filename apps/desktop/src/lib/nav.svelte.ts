import { buildSignals, localDay } from '@mindwell/core';
import { activation } from './activation.svelte';
import { getStore } from './db';
import { navCounts } from './nav';

/** Counts beside sidebar rows (Experiments, Thoughts), from the modules' signals. */
class NavState {
  counts = $state.raw<Record<string, number | null>>({});

  async refresh(): Promise<void> {
    try {
      if (!activation.loaded) await activation.load();
      const store = await getStore();
      const { signals } = await buildSignals({ store, day: localDay(new Date()), active: activation.active, chapters: activation.read });
      this.counts = navCounts(activation.active, signals);
    } catch {
      // keep the last counts; the nav still works without them
    }
  }
}

export const nav = new NavState();
