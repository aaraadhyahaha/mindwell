# Module contract

Each book chapter is one module in `packages/modules/<id>-<slug>/`. Adding a chapter = write its spec, build one folder, add one line to `apps/desktop/src/lib/registry.ts`. Nothing else changes.

## What a module exports

```ts
import type { Module } from '@mindwell/core';

export const module: Module = {
  manifest,          // id, chapter, title, idea, evidence, references
  migrations,        // ordered SQL for this module's own tables
  screens,           // [{ path: '/ch02', title, component, inNav: true, icon?, navCount?(signals) }]
  todayCards,        // [{ id, slot: 'morning'|'anytime'|'evening'|'margin', component, visible(signals), order? }]
  prompts,           // PromptDef[] added to the shared library (see PROMPTS.md)
  signals,           // SignalDef[] this module publishes
  reviewSections,    // [{ id, title, component, order }] for the weekly review
  suggestions,       // SuggestionRule[] evaluated at weekly review
  experiments,       // [{ technique, label, defaultDays }] that can be run as experiments
};
```

| Part | Notes |
| --- | --- |
| `manifest` | `id` (`ch02`), `chapter` (2; Introduction = 0), `title`, `idea` (one line), `evidence` (2–4 sentences), `references` (string[]). Shown on the module's "Why this exists" sheet and in the Library. |
| `migrations` | `{ version, sql }[]`. Tables prefixed with the module id. |
| `screens` | Svelte components under `ui/`. Routes are mounted under `/m/<id>/...` by the shell (`path: ''` is `/m/<id>`). The component receives `ModuleViewProps` (`day` = today, `signals` = a fresh snapshot). An `inNav` screen may set `icon` (a `@mindwell/ui` `Icon` name for its sidebar row) and `navCount(signals)` (pure; the number shown beside the row, or null). |
| `todayCards` | Small cards on Today. `visible(signals)` is pure. The component receives `ModuleViewProps` (`{ store, day, signals }`). `margin` cards are short notes in Today's margin column, built from `MarginNote` (label + serif lines); `order` sorts within a slot (core's "Coming up" sits at 30). |
| `prompts` | See PROMPTS.md for fields. Each prompt's `module` = this module's id. |
| `signals` | `{ key: '<id>.<name>', compute(ctx): Promise<value> }`. `compute` reads via `ctx.store` only. Keys are namespaced by module id. |
| `reviewSections` | Read data via Store/signals. Writes only to the module's own tables (e.g. a weekly check-in); suggestions are accepted through core. The component receives `ModuleViewProps` (`day` = last day of the week). |
| `suggestions` | `{ id, evaluate(signals, ctx) => Suggestion | null }`. Pure over its inputs; tested. |
| `experiments` | Techniques the Introduction module can run as trials. Reach intro through core's `experiments.available` signal (active modules only). |

## Folder layout

```
packages/modules/ch02-thought-records/
  manifest.ts
  migrations/001_init.sql
  schema.ts          # record types + small hand-written validators (no zod)
  repo.ts            # Store calls for this module's tables
  signals.ts         # + signals.test.ts
  prompts.ts         # + prompts.test.ts (conditions)
  suggestions.ts     # + suggestions.test.ts
  ui/                # Svelte screens + Today cards + review sections (built from `@mindwell/ui`)
  package.json       # deps: `@mindwell/core`, `@mindwell/ui`; `svelte` as a peer; `check` = svelte-check
  index.ts           # exports `module`
  README.md          # copy of docs/modules/ch02.md (keep in sync)
```

## Rules

- A module may import only `@mindwell/core` and `@mindwell/ui`: never other modules, the app, Tauri or SQL. Its `package.json` lists those two plus `svelte` as a peer, and its `check` script is `svelte-check --fail-on-warnings`.
- No imports from other modules. To use another module's data, read its **published signals**, or reference a core-visible record by id (e.g. ch02 stores `capture_id` from ch01). Read other modules' tables only through a signal they publish, never directly.
- Never alter another module's tables. Extra data about someone else's record goes in your own table keyed by that id (e.g. `ch03_defusions.capture_id`).
- A module is active only when its chapter is marked read in the Library. Inactive modules contribute nothing: no prompts, cards, signals, nav items.
- If a module depends on another module's signal and that module is inactive, treat the signal as `undefined` and degrade gracefully.
- Every screen has a small "Why this exists" link showing the manifest.
- UI follows `docs/DESIGN.md`. Copy follows the tone in `docs/PHILOSOPHY.md`.

## Adding a new chapter (the loop)

1. Copy `docs/modules/_TEMPLATE.md` to `docs/modules/chNN.md` and fill it in (with Claude).
2. Orchestrator splits the spec's checklist; `builder` implements items; `tester` covers signals/conditions/suggestions.
3. Add the module to `registry.ts`. Mark the chapter read in the app.
4. Use it for 1–2 weeks before starting the next chapter.
