import type { Migration } from '@mindwell/core';

export const migrations: Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE ch02_thought_records (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    day TEXT NOT NULL,
    capture_id TEXT,
    story_id TEXT,
    situation TEXT NOT NULL DEFAULT '',
    automatic_thought TEXT NOT NULL DEFAULT '',
    feeling TEXT NOT NULL DEFAULT '',
    intensity_before INTEGER,
    evidence_for TEXT NOT NULL DEFAULT '',
    evidence_against TEXT NOT NULL DEFAULT '',
    ps_permanent INTEGER NOT NULL DEFAULT 0,
    ps_pervasive INTEGER NOT NULL DEFAULT 0,
    ps_personal INTEGER NOT NULL DEFAULT 0,
    balanced_thought TEXT NOT NULL DEFAULT '',
    intensity_after INTEGER,
    complete INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ch02_thought_records_day ON ch02_thought_records (day);
CREATE INDEX ch02_thought_records_story ON ch02_thought_records (story_id);
CREATE INDEX ch02_thought_records_capture ON ch02_thought_records (capture_id)`,
  },
];
