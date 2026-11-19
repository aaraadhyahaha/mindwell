import type { Migration } from '@mindwell/core';

export const migrations: Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE ch01_stories (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    first_seen_day TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE ch01_captures (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    text TEXT NOT NULL,
    story_id TEXT,
    intensity INTEGER,
    captured_at TEXT NOT NULL,
    day TEXT NOT NULL
);
CREATE INDEX ch01_captures_day ON ch01_captures (day);
CREATE INDEX ch01_captures_story ON ch01_captures (story_id)`,
  },
];
