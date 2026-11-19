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
  await store.migrate('core', coreMigrations);
  for (const m of modules) await store.migrate(m.manifest.id, m.migrations);
  return store;
}
