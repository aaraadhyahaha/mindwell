import type { Migration } from '@mindwell/core';

export const migrations: Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE intro_experiments (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    module TEXT NOT NULL,
    technique TEXT NOT NULL,
    label TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    start_day TEXT NOT NULL,
    end_day TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    verdict TEXT,
    note TEXT
);
CREATE INDEX intro_experiments_status ON intro_experiments (status);
CREATE TABLE intro_checkins (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    experiment_id TEXT NOT NULL,
    day TEXT NOT NULL,
    rating INTEGER NOT NULL,
    note TEXT
);
CREATE INDEX intro_checkins_experiment_day ON intro_checkins (experiment_id, day)`,
  },
];
