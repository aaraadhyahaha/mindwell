import type { SqlDriver, Store } from '@mindwell/core';
import { coreMigrations } from '@mindwell/core';
import { createStore } from '@mindwell/storage-sqlite';
import { createBrowserDriver, requestPersistentStorage } from '@mindwell/storage-sqlite/browser';
import { modules } from './registry';

let ready: Promise<Store> | null = null;
/** One per tab: it holds the tab's place in the leader election (see storage-sqlite/browser). */
let driver: SqlDriver | null = null;

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
  // The data lives in this browser's origin-private file system; ask not to evict it.
  if (!driver) {
    void requestPersistentStorage().catch(() => false);
    driver = createBrowserDriver();
  }
  const store = createStore(driver);
  // Two tabs opening at once share one connection but may both try a first-run migration;
  // the loser fails, so retry briefly and find it already applied.
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
