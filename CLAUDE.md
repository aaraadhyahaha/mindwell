# mindwell

Web app companion to the book *Clear Mind, Steady Work*; it runs in the browser and is installable (PWA). Each book chapter is one self-contained module, unlocked when the user marks the chapter read. The app sets the day's intent and picks journal prompts; free writing happens in the user's paper journal.

Stack: SvelteKit (adapter-static, SPA) + Svelte 5 runes · TypeScript (strict) · SQLite WASM (opfs-sahpool) in a Web Worker · PWA via the SvelteKit service worker · pnpm workspaces · Vitest.

## Read only what the task needs

| Task touches | Read |
| --- | --- |
| Anything | this file |
| A module | `docs/modules/<id>.md` + `docs/MODULE_CONTRACT.md` |
| Prompts, signals, Today | `docs/PROMPTS.md` |
| Storage, packages, browser | `docs/ARCHITECTURE.md` |
| UI or styling | `docs/DESIGN.md` (design system lives in `packages/ui`) |
| Should this feature exist? | `docs/PHILOSOPHY.md` |
| What's next | `docs/ROADMAP.md` |

Do not read the whole repo or every doc "for context".

## Hard rules

1. `packages/core` is plain TypeScript: never imports Svelte, SQL, or any module.
2. Modules never import each other or the app; they may import only `@mindwell/core` and `@mindwell/ui`. They share data only through core records (by id) and published signals.
3. A module never alters another module's tables.
4. All persistence goes through the `Store` interface. No SQL in UI code.
5. Signals, prompt conditions and suggestion rules are pure functions with unit tests.
6. Every record has the shared columns (`id` ULID, `created_at`, `updated_at`, `deleted_at`, `schema_version`). Soft delete only.
7. Browser-only code (worker, OPFS, notifications, service worker) lives in `apps/web` and `packages/storage-sqlite/src/browser`; no domain logic there.
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

## Commands

Run from the repo root. Needs Node ≥ 22 and pnpm. No Rust.

- `pnpm install` — install all workspace packages
- `pnpm dev` — run the web app (Vite on http://localhost:5173, strict port) · `pnpm preview` — serve the build on :4173
- `pnpm test` — all unit tests (Vitest, one root config) · `pnpm vitest run <path>` — one file or folder
- `pnpm check` — runs each package's `check`: `tsc` for `packages/core` and `packages/storage-sqlite`; `svelte-check --fail-on-warnings` for `packages/ui`, every module package and `apps/web`
- `pnpm build` — release build (`vite build`; static files land in `apps/web/build/`, host anywhere). The dev test module is registered only in dev builds; a Vite plugin in `apps/web/vite.config.js` fails the release build if its code reaches the bundle.
- `pnpm --filter <pkg> add <dep>` — add a dependency to one package (e.g. `@mindwell/core`)

Workspace packages are consumed as TypeScript source (`exports` → `src/index.ts`); there is no package build step.

## Definition of done (per checklist item)

Spec's acceptance checks pass · targeted tests pass · `pnpm check` clean · no rule above broken · ROADMAP item ticked · committed.
