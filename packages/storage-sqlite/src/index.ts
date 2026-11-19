// Drivers live on subpaths so the app never bundles better-sqlite3 (native, Node-only):
//   '@mindwell/storage-sqlite/testing' → createBetterSqliteDriver (tests, better-sqlite3)
export { createStore } from './store';
