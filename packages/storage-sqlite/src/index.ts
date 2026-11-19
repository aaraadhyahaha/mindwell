// Drivers live on subpaths so the app never bundles better-sqlite3 (native, Node-only):
//   '@mindwell/storage-sqlite/tauri'   → createTauriDriver (desktop)
//   '@mindwell/storage-sqlite/testing' → createBetterSqliteDriver (tests)
export { createStore } from './store';
