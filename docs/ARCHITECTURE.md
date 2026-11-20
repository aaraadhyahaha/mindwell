# Architecture

## Repo layout

```
mindwell/
  apps/web/                     # SvelteKit (adapter-static SPA) + PWA
    src/                        # shell UI: routes, layout, service worker
      lib/registry.ts           # THE list of enabled modules
    static/                     # manifest, icons
  packages/core/                # plain TS: types, Store interface, signals, prompt engine, registry, dates
  packages/storage-sqlite/      # Store implementation over a SqlDriver
    src/browser/                # browser driver: SQLite WASM in a Web Worker, tab leader election
  packages/ui/                  # design system: tokens, base styles, bundled fonts, components (Card, Field, Scale, ...)
  packages/modules/
    intro-experiments/
    ch01-notice-name/
    ch02-thought-records/
    ch03-hard-feelings/
  docs/
```

pnpm workspaces. Package names: `@mindwell/core`, `@mindwell/storage-sqlite`, `@mindwell/ui`, `@mindwell/mod-ch01-notice-name`, etc.

## Layers

| Layer | Knows about | Never imports |
| --- | --- | --- |
| `packages/core` | its own types | Svelte, SQL, any module |
| `packages/ui` | Svelte (peer) only | the app, SQL, any module |
| `packages/modules/*` | `@mindwell/core`, `@mindwell/ui` (+ Svelte for `ui/`) | other modules, the app, storage internals |
| `packages/storage-sqlite` | `Store` + `SqlDriver` from core | UI, modules |
| `apps/web` (Svelte) | core, ui, registry, modules | SQL |
| `packages/storage-sqlite/src/browser` | worker, OPFS, Web Locks, BroadcastChannel | domain logic |

## Key interfaces (in `packages/core`)

```ts
// Shared columns on every record
interface BaseRecord {
  id: string;            // ULID
  created_at: string;    // ISO UTC
  updated_at: string;    // ISO UTC
  deleted_at: string | null;
  schema_version: number;
}

// Persistence. All reads/writes go through this.
interface Store {
  insert<T extends BaseRecord>(table: string, row: Omit<T, keyof BaseRecord>): Promise<T>;
  update<T extends BaseRecord>(table: string, id: string, patch: Partial<T>): Promise<T>;
  softDelete(table: string, id: string): Promise<void>;
  get<T>(table: string, id: string): Promise<T | null>;
  list<T>(table: string, query?: Query): Promise<T[]>; // Query = simple where/order/limit, excludes deleted by default
  migrate(owner: string, migrations: Migration[]): Promise<void>;
  transaction<R>(fn: (tx: Store) => Promise<R>): Promise<R>;
}

// Thin SQL seam so storage is testable without a browser.
interface SqlDriver {
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>;
  select<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

// Future integrations (Continuum, Leitner Box, ...). Not used in v1.
interface Importer {
  id: string;
  recordTypes: string[];                 // what it may write
  run(store: Store, since: string | null): Promise<{ imported: number }>;
}
```

- The app provides a `SqlDriver` from `createBrowserDriver()` (`@mindwell/storage-sqlite/browser`): SQLite WASM on OPFS (see Browser).
- Tests use a `SqlDriver` backed by `better-sqlite3` (in-memory), so storage and modules are tested without a browser.
- Migrations: each owner (`core`, `ch01`, ...) has ordered SQL migrations; applied versions are tracked in a `_migrations(owner, version, applied_at)` table.

## Data rules

- Every table has the `BaseRecord` columns. Soft delete only; queries exclude deleted rows by default.
- `id` is a ULID (`ulid` package): sortable and safe to create on any device later.
- Timestamps are UTC ISO strings. The user's local calendar date is stored separately as `day` (`YYYY-MM-DD`), computed by `core/dates.ts` using local time with a **day boundary at 04:00** (a 1 am evening close still belongs to the previous day).
- Validation with `zod` schemas in each module's `schema.ts`.
- Table names are prefixed by owner except core: `ch01_captures`, `ch02_thought_records`, `intro_experiments`, `days`.

## Browser

**Storage.** `createBrowserDriver()` runs the official SQLite WASM (`@sqlite.org/sqlite-wasm`) on the `opfs-sahpool` VFS (OPFS; no COOP/COEP headers needed). The file is `/mindwell.db`, opened in a dedicated Web Worker (`worker.ts`). `navigator.storage.persist()` is requested once, on first run.
- OPFS access handles allow one connection per origin, so tabs elect a leader with the Web Locks API (`mindwell-sql-leader`). The leader runs the worker; other tabs send SQL over a BroadcastChannel (`mindwell-sql`) and the leader relays. When the leader tab closes, another takes over (the worker retries while the old handles are released).
- The worker's `createSqlHost` (`host.ts`, pure, tested with better-sqlite3) holds other tabs' calls while one tab's transaction (BEGIN…COMMIT/ROLLBACK; savepoints don't release) is open. An owner idle for 10 s is rolled back.
- Store, migrations and the better-sqlite3 test driver are unchanged.

**Export.** Markdown or JSON as a normal file download (`mindwell-YYYY-MM-DD.md|json`). Today shows an "Export a backup" section (Download JSON / Markdown / Not now) when the latest of first run, last export and last dismissal is 7 or more days old (`backupDue` in `apps/web/src/lib/backup.ts`; settings keys `backup.since`, `backup.last_export_at`, `backup.dismissed_at`).

**Capture triggers.** No separate window: capture opens as a tab (details in `docs/modules/ch01.md`).
- `/#capture` (any path with that hash): the shell opens `/m/ch01/capture` with `replaceState`, input focused. When the form dispatches `mindwell:done` in such a tab, the shell tries `window.close()` and otherwise goes to Today.
- In-app key `N` (`isCaptureKey` in `apps/web/src/lib/capture-key.ts`): no Ctrl/Alt/Meta, not in a text field.
- Settings shows the compositor binding with the page's real origin, e.g. Hyprland `bind = SUPER SHIFT, N, exec, xdg-open <origin>/#capture`.

**Reminders.** Web Notifications while a mindwell tab is open: checked every 60 s with `dueReminders` (window [time, time + 60 min)). Permission is requested only from a Settings button. `catchUpReminder` runs on start, window focus and the tab becoming visible, and fires one notification for a reminder missed earlier that day (latest kind wins; a caught-up evening also marks morning sent). Module reminders (`Module.reminders`, e.g. ch03 events) go through the same loop: each tick and each catch-up gathers active modules' `ModuleReminder`s (`{key, at, until}`) and `pickReminder` shows only the latest pending one (`at ≤ now < until`, key not in the `reminder.module_sent` setting), marking every pending one sent; nothing fires at or after `until`. Notifications go through the service worker registration when present; clicking focuses the app.

**PWA and offline.** `static/manifest.webmanifest` and icons in `static/icons`; `src/service-worker.ts` (SvelteKit built-in) precaches the build, static files and `/`, serves navigations network-first with an offline fallback, and caches hashed `/_app/immutable/` files cache-first at runtime (worker and SQLite wasm). The app is installable and works offline.

**Limits.**
- Data is per browser profile and origin. Back it up (export).
- Private windows may not persist.
- One OPFS connection per origin, handled by the leader tab.
- Notifications only fire while a tab is open.

## Planned extensions (don't build yet; don't block them)

- **Phone:** reuse `core` + modules with another `SqlDriver`/`Store` (the web app already runs in mobile browsers; a sync adapter comes later). ULIDs, `updated_at` and soft deletes make sync possible.
- **Integrations:** `Importer`s write declared record types. The app never depends on another app being installed.
- **Export:** Markdown + JSON export of all records ships in Phase 0.
