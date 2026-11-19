# mindwell

Native desktop companion to the book *Clear Mind, Steady Work*. Each book chapter is one self-contained module, unlocked when the user marks the chapter read. The app sets the day's intent and picks journal prompts; free writing happens in the user's paper journal.

Stack: Tauri 2 · SvelteKit (adapter-static, SPA) + Svelte 5 runes · TypeScript (strict) · SQLite via `tauri-plugin-sql` · pnpm workspaces · Vitest.

## Read only what the task needs

| Task touches | Read |
| --- | --- |
| Anything | this file |
| A module | `docs/modules/<id>.md` + `docs/MODULE_CONTRACT.md` |
| Prompts, signals, Today | `docs/PROMPTS.md` |
| Storage, packages, native | `docs/ARCHITECTURE.md` |
| UI or styling | `docs/DESIGN.md` |
| Should this feature exist? | `docs/PHILOSOPHY.md` |
| What's next | `docs/ROADMAP.md` |

Do not read the whole repo or every doc "for context".

## Hard rules

1. `packages/core` is plain TypeScript: never imports Tauri, Svelte, SQL, or any module.
2. Modules never import each other. They share data only through core records (by id) and published signals.
3. A module never alters another module's tables.
4. All persistence goes through the `Store` interface. No SQL in UI code.
5. Signals, prompt conditions and suggestion rules are pure functions with unit tests.
6. Every record has the shared columns (`id` ULID, `created_at`, `updated_at`, `deleted_at`, `schema_version`). Soft delete only.
7. Rust (`src-tauri`) stays thin: plugins + small commands. No domain logic in Rust.
8. No feature without a chapter. No streaks, badges, confetti, quotes, emoji, gradients (see PHILOSOPHY).

## Working efficiently (keep token use low)

The main session is the orchestrator: it plans, makes architectural calls, and reviews diffs. It delegates small, well-specified work to subagents in `.claude/agents/`:

| Agent | Model | Use for |
| --- | --- | --- |
| `scout` | haiku | "Where is X / what calls Y / list files for Z". Returns paths + one-line notes, never file dumps. |
| `builder` | sonnet | Implementing one checklist item inside one folder from an approved spec (UI screens, forms, adapters, migrations, styling). |
| `tester` | haiku | Writing and running unit tests for pure functions; reports only failures. |

Keep in the main session: `packages/core` design, the prompt engine algorithm, the `Store` interface, cross-module or cross-layer changes, and anything ambiguous in a spec.

Habits:
- Delegate when the work fits in one folder and the spec already answers the questions. Give the subagent the spec path and the exact checklist item, nothing more.
- Search with `scout` (or Grep/Glob) before opening files. Open files in ranges when they are long.
- Don't re-read a file you just wrote. Don't paste large file contents into replies.
- Run targeted tests (`pnpm vitest run <path>`), not the whole suite, until the end of a phase.
- One phase (or one module) per session; `/clear` between them. Commit after each checklist item with a short message.
- Replies to the user: what changed and what's next, in a few lines.

## Commands (fill in during Phase 0)

- `pnpm install`
- `pnpm dev` — run the desktop app (`tauri dev`)
- `pnpm test` — all unit tests · `pnpm vitest run <path>` — one area
- `pnpm check` — svelte-check + tsc
- `pnpm build` — release build

## Definition of done (per checklist item)

Spec's acceptance checks pass · targeted tests pass · `pnpm check` clean · no rule above broken · ROADMAP item ticked · committed.
