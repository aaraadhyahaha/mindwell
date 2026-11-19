import type { Migration } from '@mindwell/core';

export const migrations: Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE dev_notes (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    day TEXT NOT NULL,
    body TEXT NOT NULL
)`,
  },
];
