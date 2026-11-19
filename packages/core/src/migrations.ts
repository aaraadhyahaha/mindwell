import type { Migration } from './store';

const BASE = `id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1`;

/** Core tables, applied with `store.migrate('core', coreMigrations)`. No `;` inside statements. */
export const coreMigrations: Migration[] = [
  {
    version: 1,
    sql: `
CREATE TABLE days (
    ${BASE},
    day TEXT NOT NULL,
    types TEXT NOT NULL DEFAULT '[]',
    energy INTEGER,
    intent_prompt_id TEXT,
    intent_text TEXT,
    intent_result TEXT CHECK (intent_result IN ('kept', 'partly', 'not')),
    rating INTEGER,
    checkin_at TEXT,
    closed_at TEXT
);
CREATE UNIQUE INDEX days_day ON days (day) WHERE deleted_at IS NULL;

CREATE TABLE prompts_shown (
    ${BASE},
    day TEXT NOT NULL,
    slot TEXT NOT NULL CHECK (slot IN ('morning', 'evening')),
    prompt_id TEXT NOT NULL,
    module TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('intent', 'journal')),
    technique TEXT NOT NULL,
    text TEXT NOT NULL,
    position INTEGER NOT NULL,
    replaced INTEGER NOT NULL DEFAULT 0,
    feedback TEXT CHECK (feedback IN ('useful', 'not_useful'))
);
CREATE INDEX prompts_shown_prompt_day ON prompts_shown (prompt_id, day);
CREATE INDEX prompts_shown_day_slot ON prompts_shown (day, slot);

CREATE TABLE prompt_scores (
    ${BASE},
    prompt_id TEXT NOT NULL,
    rated INTEGER NOT NULL DEFAULT 0,
    useful INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX prompt_scores_prompt ON prompt_scores (prompt_id) WHERE deleted_at IS NULL;

CREATE TABLE chapters (
    ${BASE},
    chapter INTEGER NOT NULL,
    read_day TEXT NOT NULL
);
CREATE UNIQUE INDEX chapters_chapter ON chapters (chapter) WHERE deleted_at IS NULL;

CREATE TABLE suggestions (
    ${BASE},
    rule_id TEXT NOT NULL,
    module TEXT NOT NULL,
    key TEXT NOT NULL,
    text TEXT NOT NULL,
    reason TEXT NOT NULL,
    day TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'dismissed')),
    decided_at TEXT
);
CREATE INDEX suggestions_key ON suggestions (key);

CREATE TABLE settings (
    ${BASE},
    key TEXT NOT NULL,
    value TEXT NOT NULL
);
CREATE UNIQUE INDEX settings_key ON settings (key) WHERE deleted_at IS NULL
`,
  },
];
