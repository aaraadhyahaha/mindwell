import type { Migration } from '@mindwell/core';

// No free-text columns on ch03_sessions or ch03_gratitude: journal text is never stored.
export const migrations: Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE ch03_defusions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    capture_id TEXT,
    thought_text TEXT NOT NULL,
    day TEXT NOT NULL
);
CREATE INDEX ch03_defusions_day ON ch03_defusions (day);
CREATE TABLE ch03_events (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    day TEXT NOT NULL,
    reframe_helped TEXT,
    outcome_rating INTEGER
);
CREATE INDEX ch03_events_day ON ch03_events (day);
CREATE TABLE ch03_series (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    topic TEXT NOT NULL,
    planned_days INTEGER NOT NULL,
    start_day TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX ch03_series_day ON ch03_series (start_day);
CREATE TABLE ch03_sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    series_id TEXT NOT NULL,
    day TEXT NOT NULL,
    minutes INTEGER NOT NULL,
    mood_before INTEGER NOT NULL,
    mood_after INTEGER
);
CREATE INDEX ch03_sessions_day ON ch03_sessions (day);
CREATE INDEX ch03_sessions_series ON ch03_sessions (series_id);
CREATE TABLE ch03_gratitude (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    day TEXT NOT NULL
);
CREATE INDEX ch03_gratitude_day ON ch03_gratitude (day)`,
  },
];
