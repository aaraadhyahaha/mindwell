import type { Store } from '@mindwell/core';
import { coreMigrations } from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createTauriDriver } from '@mindwell/storage-sqlite/tauri';
import { modules } from './registry';

let ready: Promise<Store> | null = null;

/**
 * The app's Store, opened once. Applies core migrations, then every registered
 * module's (active or not), so marking a chapter read needs no migration step.
 */
export function getStore(): Promise<Store> {
  ready ??= open().catch((err: unknown) => {
    ready = null;
    throw err;
  });
  return ready;
}

async function open(): Promise<Store> {
  const store = createStore(await createTauriDriver('sqlite:mindwell.db'));
  // The main and capture windows open the database at the same time. On a first run both may
  // try the same migration; the loser fails, so retry briefly and find it already applied.
  for (let attempt = 1; ; attempt++) {
    try {
      await store.migrate('core', coreMigrations);
      for (const m of modules) await store.migrate(m.manifest.id, m.migrations);
      return store;
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 150 * attempt));
    }
  }
}
