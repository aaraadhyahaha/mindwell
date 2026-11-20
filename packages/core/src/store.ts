/** Shared columns on every record (hard rule 6). */
export interface BaseRecord {
  /** ULID, see `newId()`. */
  id: string;
  /** ISO 8601 UTC. */
  created_at: string;
  /** ISO 8601 UTC. */
  updated_at: string;
  /** ISO 8601 UTC, or null while the record is live. Soft delete only. */
  deleted_at: string | null;
  /** Version of the record's shape, for later data migrations. Defaults to 1. */
  schema_version: number;
}

/** The fields a caller supplies; the Store fills in the BaseRecord columns. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>;

/** Fields a caller may change. BaseRecord columns are managed by the Store. */
export type RecordPatch<T extends BaseRecord> = Partial<NewRecord<T>>;

/** A value that can be bound as a SQL parameter. */
export type SqlValue = string | number | boolean | null;

export interface OrderBy {
  column: string;
  direction?: 'asc' | 'desc';
}

/**
 * Simple list query. `where` matches by equality on every entry (AND);
 * a `null` value matches `IS NULL`. Soft-deleted rows are excluded
 * unless `includeDeleted` is true.
 */
export interface Query {
  where?: Record<string, SqlValue>;
  orderBy?: OrderBy | OrderBy[];
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}

export interface GetOptions {
  /** Return the row even if soft-deleted. Default false (deleted → null). */
  includeDeleted?: boolean;
}

export interface InsertOptions {
  /** Stored in `schema_version`. Default 1. */
  schemaVersion?: number;
}

/**
 * Ordered SQL for one owner (`core`, `ch01`, ...). Versions start at 1 and
 * increase; applied versions are recorded in `_migrations(owner, version, applied_at)`.
 * `sql` may contain several statements separated by `;`. It is split on every `;`,
 * so no `;` inside string literals or trigger bodies.
 */
export interface Migration {
  version: number;
  sql: string;
}

/**
 * All persistence goes through this (hard rule 4). Table and column names
 * are identifiers (`[A-Za-z_][A-Za-z0-9_]*`); the Store rejects anything else.
 * Rows are returned as stored: no type conversion beyond what the driver does.
 */
export interface Store {
  /** Generates id, timestamps, `deleted_at: null` and `schema_version`, then returns the full row. */
  insert<T extends BaseRecord>(table: string, row: NewRecord<T>, options?: InsertOptions): Promise<T>;
  /** Applies the patch, bumps `updated_at`, returns the updated row. Throws if the row is missing or deleted. */
  update<T extends BaseRecord>(table: string, id: string, patch: RecordPatch<T>): Promise<T>;
  /** Sets `deleted_at` (and `updated_at`). Rows are never removed. */
  softDelete(table: string, id: string): Promise<void>;
  /** Returns null when missing, or when soft-deleted unless `includeDeleted`. */
  get<T extends BaseRecord>(table: string, id: string, options?: GetOptions): Promise<T | null>;
  list<T extends BaseRecord>(table: string, query?: Query): Promise<T[]>;
  /** Names of every record table (core and modules), sorted. Excludes internal tables such as `_migrations`. */
  tables(): Promise<string[]>;
  /** Applies, in version order, each migration not yet recorded for `owner`. Safe to call repeatedly. */
  migrate(owner: string, migrations: Migration[]): Promise<void>;
  /**
   * Writes a complete row verbatim (its own id, timestamps and schema_version), replacing
   * the columns of any row with the same id. For restoring a backup only; app code uses
   * `insert`/`update`. Never removes rows.
   */
  put(table: string, row: BaseRecord & Record<string, SqlValue>): Promise<void>;
  /** Runs `fn` atomically: commits if it resolves, rolls back if it throws. */
  transaction<R>(fn: (tx: Store) => Promise<R>): Promise<R>;
}

/** Thin SQL seam so storage is testable without a browser. Positional `?` parameters. */
export interface SqlDriver {
  execute(sql: string, params?: SqlValue[]): Promise<{ rowsAffected: number }>;
  select<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
}

/** Future integrations (Continuum, Leitner Box, ...). Not used in v1. */
export interface Importer {
  id: string;
  /** Tables it may write. */
  recordTypes: string[];
  run(store: Store, since: string | null): Promise<{ imported: number }>;
}
