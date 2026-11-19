# Roadmap

Build in phases. Use each phase for 1–2 weeks before the next. Tags say who does the item: **[main]** = orchestrating session, **[builder]** / **[tester]** = subagents (see CLAUDE.md).

## Phase 0 — Skeleton (no chapter features)

- [x] [main] Scaffold monorepo: pnpm workspaces, `apps/desktop` (create-tauri-app, SvelteKit + TS), `packages/core`, `packages/storage-sqlite`; strict TS; Vitest; `pnpm check`. Fill in CLAUDE.md commands.
- [x] [main] `core`: BaseRecord, Store, SqlDriver, Migration, Module, PromptDef, SignalDef, SuggestionRule types; `dates.ts` (day with 04:00 boundary); ULID helper.
- [x] [builder] `storage-sqlite`: Store over SqlDriver, migrations table, soft delete; Tauri driver (plugin-sql) + better-sqlite3 test driver.
- [x] [tester] Tests for Store (CRUD, soft delete, migrations idempotent) and `dates.ts`.
- [x] [builder] Design system: tokens, bundled fonts, components from DESIGN.md, dev `/styleguide`. **Review before screens.**
- [x] [main] Module registry + Library (mark chapter read → module active) + core tables (`days`, `prompts_shown`, `prompt_scores`, `chapters`, `suggestions`, `settings`).
- [x] [main] Signals snapshot + prompt engine (PROMPTS.md) + core prompts.
- [x] [tester] Tests for selection: conditions, cooldowns, technique de-dup, scoring, fallbacks, seeded jitter stability.
- [x] [builder] Today: morning check-in, evening close, slots, PromptCard feedback, "show another".
- [ ] [builder] Weekly review frame (sections + suggestions accept/dismiss), Settings (name, reminder times 07:30 / 21:30, theme), reminders via notification plugin.
- [ ] [builder] Export all records to Markdown + JSON.
- [ ] [main] Phase check: daily loop works end to end with a dummy module; check-in and close each < 3 min.

## Phase 1 — Introduction + Chapter 1 → `docs/modules/intro.md`, `docs/modules/ch01.md`
## Phase 2 — Chapter 2 → `docs/modules/ch02.md`
## Phase 3 — Chapter 3 → `docs/modules/ch03.md`

Each spec has its own checklist.

## Later chapters (spec written after reading each chapter)

| Ch | Module |
| --- | --- |
| 4 | Goal sheet: 1–3 goals, why, subgoals, learning goal for new areas, quarterly revisit |
| 5 | Weekly WOOP; one-minute process rehearsal card |
| 6 | If-then plans (starting / shielding / recovery) as OS notifications at the cue |
| 7 | Habits: fixed cue, minimum version, friction checklist, ~66-day view |
| 8 | Practice log: weak spots, self-testing, spacing schedule |
| 9 | Daily tick chart, predicted vs actual, full five-question weekly review |
| 10 | Sleep and movement log; "tired?" check before late-night thought records |
| 11 | Slip flow (three questions), never miss twice, fresh-start dates |
| 12 | Wins list, confidence ladders, **evidence ledger** across all modules |

## Deferred (designed for, not built)

Phone companion · sync · importers (Continuum, Leitner Box) · app lock / encryption.
