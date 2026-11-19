# Architecture

## Repo layout

```
mindwell/
  apps/desktop/                 # SvelteKit (adapter-static) + Tauri 2
    src/                        # shell UI: routes, layout, design system
      lib/registry.ts           # THE list of enabled modules
      lib/ui/                   # design-system components (Card, Field, Scale, ...)
    src-tauri/                  # thin Rust: plugins + tiny commands
  packages/core/                # plain TS: types, Store interface, signals, prompt engine, registry, dates
  packages/storage-sqlite/      # Store implementation over a SqlDriver
  packages/modules/
    intro-experiments/
    ch01-notice-name/
    ch02-thought-records/
    ch03-hard-feelings/
  docs/
```

pnpm workspaces. Package names: `@mindwell/core`, `@mindwell/storage-sqlite`, `@mindwell/mod-ch01-notice-name`, etc.

## Layers

| Layer | Knows about | Never imports |
| --- | --- | --- |
| `packages/core` | its own types | Tauri, Svelte, SQL, any module |
| `packages/modules/*` | `@mindwell/core` (+ Svelte for `ui/`) | other modules, Tauri, storage internals |
| `packages/storage-sqlite` | `Store` + `SqlDriver` from core | UI, modules |
| `apps/desktop` (Svelte) | core, registry, modules, design system | SQL |
| `src-tauri` (Rust) | plugins | domain logic |

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

// Thin SQL seam so storage is testable without Tauri.
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

- Desktop provides a `SqlDriver` backed by `@tauri-apps/plugin-sql` (database `sqlite:mindwell.db` in the app data dir).
- Tests use a `SqlDriver` backed by `better-sqlite3` (in-memory), so storage and modules are tested without Tauri.
- Migrations: each owner (`core`, `ch01`, ...) has ordered SQL migrations; applied versions are tracked in a `_migrations(owner, version, applied_at)` table.

## Data rules

- Every table has the `BaseRecord` columns. Soft delete only; queries exclude deleted rows by default.
- `id` is a ULID (`ulid` package): sortable and safe to create on any device later.
- Timestamps are UTC ISO strings. The user's local calendar date is stored separately as `day` (`YYYY-MM-DD`), computed by `core/dates.ts` using local time with a **day boundary at 04:00** (a 1 am evening close still belongs to the previous day).
- Validation with `zod` schemas in each module's `schema.ts`.
- Table names are prefixed by owner except core: `ch01_captures`, `ch02_thought_records`, `intro_experiments`, `days`.

## Native (src-tauri)

Plugins: `sql` (sqlite), `global-shortcut` (capture), `notification` (reminders, reappraisal cards), `dialog` + `fs` (export). Small commands only, e.g. `focus_capture_window`. Optional app lock is deferred (not needed for v1).

## Planned extensions (don't build yet; don't block them)

- **Phone:** reuse `core` + modules with another `SqlDriver`/`Store` (Tauri 2 mobile target, or a web companion + a sync adapter). ULIDs, `updated_at` and soft deletes make sync possible later.
- **Integrations:** `Importer`s write declared record types. The app never depends on another app being installed.
- **Export:** Markdown + JSON export of all records ships in Phase 0.
