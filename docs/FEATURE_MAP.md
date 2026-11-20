# Feature map

Index only. Line format: `- feature → files → exported symbols → tests → spec`. `—` = none.
Every backticked path and symbol is checked by `scripts/check-feature-map.mjs` (runs in `pnpm check`).
A symbol must appear in one of the files on its line. Update this file in the same commit as any feature add/move/rename.

## Where to change…

| Task | Go to |
| --- | --- |
| Add a prompt | module `prompts.ts` (e.g. `packages/modules/ch02-thought-records/prompts.ts`); core prompts `packages/core/src/core-prompts.ts`; spec `docs/PROMPTS.md#prompt-definition` |
| Add a signal | module `signals.ts` (e.g. `packages/modules/ch01-notice-name/signals.ts`); core signals `packages/core/src/signals.ts` |
| Add a Today card | module `ui/*Card.svelte` + `todayCards` in module `index.ts`; page `apps/web/src/routes/+page.svelte`, logic `apps/web/src/lib/today.ts` |
| Add a migration | module `migrations.ts`; core `packages/core/src/migrations.ts`; run order `apps/web/src/lib/db.ts` |
| Add a screen | module `ui/*Screen.svelte` + `screens` in module `index.ts`; served by `apps/web/src/routes/m/[id]/[...path]/+page.svelte` |
| Add an app route | `apps/web/src/routes/`; nav in `apps/web/src/lib/nav.ts` |
| Change a token / font | `packages/ui/src/tokens.css`, `packages/ui/src/fonts.css`; spec `docs/DESIGN.md#tokens` |
| Export | `packages/core/src/export.ts`; app side `apps/web/src/lib/export.ts`, `apps/web/src/lib/backup.ts` |
| Notifications | `apps/web/src/lib/reminders.ts`, `apps/web/src/lib/reminders.svelte.ts`, `apps/web/src/service-worker.ts` |
| Capture | key/overlay `apps/web/src/lib/capture.svelte.ts`, `apps/web/src/lib/capture-key.ts`; screen `packages/modules/ch01-notice-name/ui/CaptureScreen.svelte` |
| Register a module | `apps/web/src/lib/registry.ts`; contract `docs/MODULE_CONTRACT.md#what-a-module-exports` |

## core (`packages/core/src`)

- Store interface, base record → `packages/core/src/store.ts` → `BaseRecord`, `Store`, `Query`, `Migration`, `SqlDriver`, `Importer` → — → `docs/ARCHITECTURE.md#key-interfaces-in-packagescore`
- ULID ids → `packages/core/src/id.ts` → `newId`, `isId` → — → `docs/ARCHITECTURE.md#data-rules`
- Core records and tables → `packages/core/src/records.ts` → `CORE_TABLES`, `DAY_TYPES`, `DayRecord`, `PromptShownRecord`, `SuggestionRecord`, `SettingRecord` → `packages/storage-sqlite/src/core-tables.test.ts` → `docs/ARCHITECTURE.md#data-rules`
- Core migrations → `packages/core/src/migrations.ts` → `coreMigrations` → `packages/storage-sqlite/src/core-tables.test.ts` → —
- Dates, day boundary → `packages/core/src/dates.ts` → `DAY_BOUNDARY_HOUR`, `localDay`, `isDay`, `addDays`, `daysBetween` → `packages/core/src/dates.test.ts` → —
- Module contract types → `packages/core/src/module.ts` → `Module`, `ModuleManifest`, `ScreenDef`, `TodayCardDef`, `ReviewSectionDef`, `ExperimentDef`, `ReminderDef`, `ModuleReminder`, `ReminderContext` → — → `docs/MODULE_CONTRACT.md#what-a-module-exports`
- Module registry → `packages/core/src/registry.ts` → `validateModules`, `activeModules`, `recentlyUnlocked`, `libraryEntries`, `RECENTLY_UNLOCKED_DAYS`, `LibraryEntry` → `packages/core/src/registry.test.ts` → `docs/MODULE_CONTRACT.md#rules`
- Book chapters and parts → `packages/core/src/book.ts` → `BOOK_CHAPTERS`, `BOOK_PARTS`, `BookChapter`, `BookPart` → — → —
- Chapter read state → `packages/core/src/library.ts` → `readChapters`, `markChapterRead`, `markChapterUnread` → — → —
- Signals → `packages/core/src/signals.ts` → `CORE_SIGNALS`, `coreSignals`, `buildSignals`, `signalNumber`, `chaptersReadSignal`, `experimentsSignal` → `packages/core/src/signals.test.ts` → `docs/PROMPTS.md#signals`
- Signal/prompt/suggestion types → `packages/core/src/prompts.ts` → `SignalValue`, `Signals`, `SignalDef`, `PromptDef`, `PromptKind`, `PromptWhen`, `SuggestionRule`, `Suggestion`, `SuggestionContext` → — → `docs/PROMPTS.md#prompt-definition`
- Core prompt library → `packages/core/src/core-prompts.ts` → `corePrompts`, `FALLBACK_INTENT_ID`, `FALLBACK_JOURNAL_ID` → — → `docs/PROMPTS.md#core-prompts-phase-0`
- Prompt engine (score, select) → `packages/core/src/engine.ts` → `selectPrompts`, `scorePrompt`, `renderPrompt`, `candidates`, `usefulness`, `jitter` → `packages/core/src/engine.test.ts` → `docs/PROMPTS.md#selection-algorithm-morning-evening-is-the-same-with-when-evening-and-max-1-journal-prompt`
- Prompt library, swap → `packages/core/src/engine.ts` → `promptLibrary`, `showAnother`, `SLOT_RULES`, `NOVELTY_BONUS`, `daysSinceShown`, `SelectionInput` → `packages/core/src/engine.test.ts` → —
- Prompt history log → `packages/core/src/prompt-log.ts` → `loadPromptHistory`, `recordShown`, `recordSwap`, `setFeedback`, `shownInSlot`, `PromptHistory` → `packages/storage-sqlite/src/prompt-log.test.ts` → —
- Suggestions (evaluate, decide) → `packages/core/src/review.ts` → `evaluateSuggestions`, `reviewSuggestions`, `decideSuggestion`, `ProposedSuggestion`, `SuggestionEvaluation` → `packages/core/src/review.test.ts` → —
- Weekly review data → `packages/core/src/review.ts` → `reviewWeek`, `weekSummary`, `REVIEW_DAYS`, `WeekSummary` → `packages/core/src/review.test.ts`, `packages/storage-sqlite/src/review.test.ts` → —
- Module reminder pick (latest pending, dedupe) → `packages/core/src/reminders.ts` → `pickReminder`, `pruneSent`, `ReminderPick` → `packages/core/src/reminders.test.ts` → `docs/MODULE_CONTRACT.md#what-a-module-exports`
- Export → `packages/core/src/export.ts` → `collectRecords`, `exportJson`, `exportMarkdown`, `EXPORT_FORMAT_VERSION`, `RecordDump` → `packages/core/src/export.test.ts` → —

## storage (`packages/storage-sqlite/src`)

- Store implementation + migrate (`_migrations` table) → `packages/storage-sqlite/src/store.ts`, `packages/storage-sqlite/src/index.ts` → `createStore` → `packages/storage-sqlite/src/store.test.ts` → `docs/ARCHITECTURE.md#layers`
- Test driver (better-sqlite3) → `packages/storage-sqlite/src/better-sqlite-driver.ts` → `createBetterSqliteDriver` → `packages/storage-sqlite/src/store.test.ts` → —
- Browser driver (main thread) → `packages/storage-sqlite/src/browser/browser.ts` → `createBrowserDriver`, `requestPersistentStorage`, `BrowserDriverStatus` → — → `docs/ARCHITECTURE.md#browser`
- RPC client (tab side) → `packages/storage-sqlite/src/browser/client.ts` → `createRpcDriver`, `RpcDriver` → `packages/storage-sqlite/src/browser/host.test.ts` → `docs/ARCHITECTURE.md#browser`
- Worker host (tx lock, idle rollback) → `packages/storage-sqlite/src/browser/host.ts` → `createSqlHost`, `SqlHost`, `HostDb`, `HostOptions` → `packages/storage-sqlite/src/browser/host.test.ts` → `docs/ARCHITECTURE.md#browser`
- Worker entry (SQLite WASM, opfs-sahpool) → `packages/storage-sqlite/src/browser/worker.ts` → — → — → `docs/ARCHITECTURE.md#browser`
- Worker protocol → `packages/storage-sqlite/src/browser/protocol.ts` → `bind`, `SqlRequest`, `SqlResponse`, `ToWorker`, `FromWorker`, `TabMessage`, `BoundValue` → `packages/storage-sqlite/src/browser/host.test.ts` → —

## ui (`packages/ui/src`, package `@mindwell/ui`)

- Tokens (light/dark) → `packages/ui/src/tokens.css` → `--bg`, `--ink`, `--accent`, `--surface`, `--font-serif`, `--font-sans`, `--space-1`, `--reading-width` → — → `docs/DESIGN.md#tokens`
- Base styles → `packages/ui/src/base.css` → — → — → `docs/DESIGN.md#tokens`
- Fonts (Tinos, Schibsted Grotesk) → `packages/ui/src/fonts.css`, `packages/ui/src/fonts/` → `Tinos`, `Schibsted Grotesk` → — → `docs/DESIGN.md#tokens`
- Theme → `packages/ui/src/theme.svelte.ts` → `theme`, `setTheme`, `ThemePreference` → — → —
- Package exports → `packages/ui/src/index.ts` → `Page`, `Shell`, `Card`, `Icon`, `isIconName`, `IconName`, `TocEntry` → — → `docs/DESIGN.md#components-in-packagesuisrc-package-mindwellui`
- Layout, nav → `packages/ui/src/Page.svelte`, `packages/ui/src/Shell.svelte`, `packages/ui/src/Sidebar.svelte`, `packages/ui/src/NavLabel.svelte`, `packages/ui/src/NavItem.svelte`, `packages/ui/src/Toolbar.svelte`, `packages/ui/src/Toc.svelte` → — → — → `docs/DESIGN.md#shell-every-screen`
- Typography, decoration → `packages/ui/src/Opener.svelte`, `packages/ui/src/SectionLabel.svelte`, `packages/ui/src/Epigraph.svelte`, `packages/ui/src/Ornament.svelte`, `packages/ui/src/MarginNote.svelte` → — → — → `docs/DESIGN.md#components-in-packagesuisrc-package-mindwellui`
- Cards, prompts → `packages/ui/src/Card.svelte`, `packages/ui/src/PromptCard.svelte`, `packages/ui/src/PromptList.svelte` → — → — → `docs/DESIGN.md#patterns`
- Form inputs → `packages/ui/src/Field.svelte`, `packages/ui/src/Scale.svelte`, `packages/ui/src/Choice.svelte`, `packages/ui/src/Step.svelte` → — → — → `docs/DESIGN.md#patterns`
- Buttons → `packages/ui/src/Button.svelte`, `packages/ui/src/IconButton.svelte` → — → — → —
- Why link / sheet → `packages/ui/src/WhyLink.svelte`, `packages/ui/src/WhySheet.svelte` → — → — → —
- Data display → `packages/ui/src/LineChart.svelte`, `packages/ui/src/RatingDots.svelte`, `packages/ui/src/Meter.svelte`, `packages/ui/src/Tag.svelte`, `packages/ui/src/Kbd.svelte` → — → — → —
- Icons → `packages/ui/src/Icon.svelte` → — → — → —

## web app shell and routes (`apps/web`)

- Shell layout, nav → `apps/web/src/routes/+layout.svelte`, `apps/web/src/routes/+layout.ts`, `apps/web/src/lib/nav.ts`, `apps/web/src/lib/nav.svelte.ts` → `moduleNavLinks`, `navCounts`, `tocRows`, `moduleRunningHead`, `TOC_AHEAD`, `NavLink`, `TocRow`, `nav` → `apps/web/src/lib/nav.test.ts` → `docs/DESIGN.md#shell-every-screen`
- Today (`/`) → `apps/web/src/routes/+page.svelte`, `apps/web/src/lib/today.ts`, `apps/web/src/lib/today.svelte.ts` → `EVENING_OPENS_HOUR`, `isEveningOpen`, `selectionFromRows`, `dayHeading`, `todayPhase`, `TodayState`, `ShownPrompt` → `apps/web/src/lib/today.test.ts`, `apps/web/src/lib/daily-loop.test.ts` → `docs/PROMPTS.md#today-page`
- Module registration, dev-test gating → `apps/web/src/lib/registry.ts` → `modules`, `ModuleComponent` → — → `docs/MODULE_CONTRACT.md#adding-a-new-chapter-the-loop`
- Store bootstrap, migration order → `apps/web/src/lib/db.ts` → `getStore` → — → `docs/ARCHITECTURE.md#browser`
- Service worker, PWA → `apps/web/src/service-worker.ts`, `apps/web/static/manifest.webmanifest` → `CACHE` → — → `docs/ARCHITECTURE.md#browser`
- Reminders, notifications → `apps/web/src/lib/reminders.ts`, `apps/web/src/lib/reminders.svelte.ts` → `dueReminders`, `catchUpReminder`, `REMINDER_WINDOW_MIN`, `ReminderConfig`, `requestNotificationPermission`, `startReminders`, `moduleTick` → `apps/web/src/lib/reminders.test.ts` → —
- Export, backup nudge → `apps/web/src/lib/export.ts`, `apps/web/src/lib/backup.ts` → `exportRecords`, `ExportFormat`, `ExportResult`, `BACKUP_INTERVAL_DAYS`, `backupDue` → `apps/web/src/lib/backup.test.ts` → —
- Quick capture → `apps/web/src/lib/capture.svelte.ts`, `apps/web/src/lib/capture-key.ts` → `CAPTURE_KEY`, `capture`, `openCapture`, `isCaptureKey`, `CaptureKeyEvent` → `apps/web/src/lib/capture-key.test.ts` → —
- Weekly review (`/week`) → `apps/web/src/routes/week/+page.svelte`, `apps/web/src/lib/week.ts` → `weekRangeLabel` → `apps/web/src/lib/week.test.ts` → —
- Settings (`/settings`) → `apps/web/src/routes/settings/+page.svelte`, `apps/web/src/lib/settings.svelte.ts` → `SETTING_KEYS`, `SettingsState`, `settings` → — → —
- Library, chapter unlock (`/library`) → `apps/web/src/routes/library/+page.svelte`, `apps/web/src/lib/activation.svelte.ts` → `activation` → — → —
- Module pages (`/m/[id]/[...path]`) → `apps/web/src/routes/m/[id]/[...path]/+page.svelte` → — → — → `docs/MODULE_CONTRACT.md#what-a-module-exports`
- Styleguide (`/styleguide`, dev only) → `apps/web/src/routes/styleguide/+page.svelte`, `apps/web/src/routes/styleguide/+page.ts`, `apps/web/src/routes/styleguide/Panel.svelte` → `load` → — → `docs/DESIGN.md#process`
- Release guard for dev-test → `apps/web/vite.config.js` → `noDevModuleInRelease` → — → —

## intro — Experiments (`packages/modules/intro-experiments`)

- Module, manifest → `packages/modules/intro-experiments/index.ts`, `packages/modules/intro-experiments/manifest.ts` → `module`, `manifest` → — → `docs/modules/intro.md`
- Records, validators → `packages/modules/intro-experiments/schema.ts` → `ExperimentRecord`, `CheckinRecord`, `MAX_ACTIVE`, `DEFAULT_LENGTH`, `validateHypothesis`, `validateLength`, `validateRating` → — → `docs/modules/intro.md#records`
- Migrations → `packages/modules/intro-experiments/migrations.ts` → `migrations` → `packages/modules/intro-experiments/repo.test.ts` → `docs/modules/intro.md#records`
- Repo → `packages/modules/intro-experiments/repo.ts` → `ExperimentLimitError`, `listExperiments`, `activeExperiments`, `startExperiment`, `setVerdict`, `extendExperiment`, `endEarly`, `saveCheckin` → `packages/modules/intro-experiments/repo.test.ts`, `packages/modules/intro-experiments/e2e.test.ts` → —
- Signals, visibility → `packages/modules/intro-experiments/signals.ts` → `signals`, `introSignalValues`, `midpoint`, `verdictCardVisible`, `experimentsNavCount`, `experimentProgress`, `experimentNoteVisible` → `packages/modules/intro-experiments/signals.test.ts` → `docs/modules/intro.md#signals-published`
- Prompts → `packages/modules/intro-experiments/prompts.ts` → `prompts` → `packages/modules/intro-experiments/prompts.test.ts` → `docs/modules/intro.md#prompts`
- Suggestions → `packages/modules/intro-experiments/suggestions.ts` → `suggestions` → `packages/modules/intro-experiments/suggestions.test.ts` → `docs/modules/intro.md#suggestions`
- Screen → `packages/modules/intro-experiments/ui/ExperimentsScreen.svelte`, `packages/modules/intro-experiments/ui/VerdictForm.svelte` → — → — → `docs/modules/intro.md#screens-and-today-cards`
- Today cards (verdict, margin note) → `packages/modules/intro-experiments/ui/VerdictCard.svelte`, `packages/modules/intro-experiments/ui/ExperimentNote.svelte` → — → — → `docs/modules/intro.md#screens-and-today-cards`
- Weekly review section → `packages/modules/intro-experiments/ui/ReviewSection.svelte` → — → — → `docs/modules/intro.md#weekly-review-section`

## ch01 — Notice and name (`packages/modules/ch01-notice-name`)

- Module, manifest → `packages/modules/ch01-notice-name/index.ts`, `packages/modules/ch01-notice-name/manifest.ts` → `module`, `manifest` → — → `docs/modules/ch01.md`
- Records, validators → `packages/modules/ch01-notice-name/schema.ts` → `StoryRecord`, `CaptureRecord`, `validateCaptureText`, `validateIntensity`, `validateStoryName` → — → `docs/modules/ch01.md#records`
- Migrations → `packages/modules/ch01-notice-name/migrations.ts` → `migrations` → `packages/modules/ch01-notice-name/repo.test.ts` → `docs/modules/ch01.md#records`
- Repo → `packages/modules/ch01-notice-name/repo.ts` → `listStories`, `createStory`, `archiveStory`, `renameStory`, `addCapture`, `linkCapture`, `capturesOnDay`, `capturesBetween`, `storyMatchFor` → `packages/modules/ch01-notice-name/repo.test.ts` → —
- Story matching → `packages/modules/ch01-notice-name/storyMatch.ts` → `words`, `suggestStory` → `packages/modules/ch01-notice-name/storyMatch.test.ts` → `docs/modules/ch01.md#implementation-notes`
- Signals, visibility → `packages/modules/ch01-notice-name/signals.ts` → `signals`, `ch01SignalValues`, `eveningCardVisible`, `thoughtsNavCount`, `storyBars`, `storiesNoteVisible` → `packages/modules/ch01-notice-name/signals.test.ts` → `docs/modules/ch01.md#signals-published`
- Link capture to ch02 record → `packages/modules/ch01-notice-name/signals.ts`, `packages/modules/ch01-notice-name/ui/EveningCard.svelte` → `thoughtRecordHref` → `packages/modules/ch01-notice-name/signals.test.ts` → `docs/modules/ch02.md#reading-ch01`
- Prompts → `packages/modules/ch01-notice-name/prompts.ts` → `prompts` → `packages/modules/ch01-notice-name/prompts.test.ts` → `docs/modules/ch01.md#prompts`
- Suggestions → `packages/modules/ch01-notice-name/suggestions.ts` → `suggestions` → `packages/modules/ch01-notice-name/suggestions.test.ts` → `docs/modules/ch01.md#suggestions`
- Thoughts view helpers → `packages/modules/ch01-notice-name/thoughts.ts` → `dayMonth`, `dayLabel`, `clockTime`, `storyRows`, `sparkHeights`, `capturesByDay` → `packages/modules/ch01-notice-name/thoughts.test.ts` → —
- Screens (thoughts, capture, link story) → `packages/modules/ch01-notice-name/ui/ThoughtsScreen.svelte`, `packages/modules/ch01-notice-name/ui/CaptureScreen.svelte`, `packages/modules/ch01-notice-name/ui/LinkStory.svelte` → — → — → `docs/modules/ch01.md#screens-and-today-cards`
- Today cards (evening, stories note) → `packages/modules/ch01-notice-name/ui/EveningCard.svelte`, `packages/modules/ch01-notice-name/ui/StoriesNote.svelte` → — → — → `docs/modules/ch01.md#screens-and-today-cards`
- Weekly review section → `packages/modules/ch01-notice-name/ui/ReviewSection.svelte` → — → — → `docs/modules/ch01.md#weekly-review-section`

## ch02 — Thought records (`packages/modules/ch02-thought-records`)

- Module, manifest → `packages/modules/ch02-thought-records/index.ts`, `packages/modules/ch02-thought-records/manifest.ts` → `module`, `manifest` → — → `docs/modules/ch02.md`
- Records, validators → `packages/modules/ch02-thought-records/schema.ts` → `ThoughtRecord`, `ThoughtRecordFields`, `DraftPatch`, `validateIntensity100`, `validateText`, `validateFeeling`, `isComplete` → — → `docs/modules/ch02.md#records`
- Migrations → `packages/modules/ch02-thought-records/migrations.ts` → `migrations` → `packages/modules/ch02-thought-records/repo.test.ts` → `docs/modules/ch02.md#records`
- Repo → `packages/modules/ch02-thought-records/repo.ts` → `startRecord`, `saveDraft`, `getRecord`, `listRecords`, `listDrafts`, `recordsBetween`, `discardRecord` → `packages/modules/ch02-thought-records/repo.test.ts` → —
- Signals, visibility → `packages/modules/ch02-thought-records/signals.ts` → `signals`, `ch02SignalValues`, `storyNames`, `unchallengedStory`, `storyTrend`, `startCardVisible`, `recordsNavCount` → `packages/modules/ch02-thought-records/signals.test.ts` → `docs/modules/ch02.md#signals-published`
- Prompts → `packages/modules/ch02-thought-records/prompts.ts` → `prompts` → `packages/modules/ch02-thought-records/prompts.test.ts` → `docs/modules/ch02.md#prompts`
- Suggestions → `packages/modules/ch02-thought-records/suggestions.ts` → `suggestions`, `WEAKENING_DROP` → `packages/modules/ch02-thought-records/suggestions.test.ts` → `docs/modules/ch02.md#suggestions`
- Form helpers (steps, three Ps, coach line) → `packages/modules/ch02-thought-records/form.ts` → `STEPS`, `THREE_PS`, `coachLine`, `emptyFields`, `changedFields`, `stepFilled`, `missingForComplete` → `packages/modules/ch02-thought-records/form.test.ts` → `docs/modules/ch02.md#what-the-user-does`
- Start from ch01 capture → `packages/modules/ch02-thought-records/form.ts` → `startParams`, `findCapture` → `packages/modules/ch02-thought-records/form.test.ts` → `docs/modules/ch02.md#reading-ch01`
- History, per-story chart data → `packages/modules/ch02-thought-records/history.ts` → `dayLabel`, `groupByDay`, `storyCharts`, `draftStep`, `StoryChart` → `packages/modules/ch02-thought-records/history.test.ts` → —
- Screens (form, history) → `packages/modules/ch02-thought-records/ui/RecordForm.svelte`, `packages/modules/ch02-thought-records/ui/HistoryScreen.svelte` → — → — → `docs/modules/ch02.md#screens-and-today-cards`
- Today card (start) → `packages/modules/ch02-thought-records/ui/StartCard.svelte` → — → — → `docs/modules/ch02.md#screens-and-today-cards`
- Weekly review section → `packages/modules/ch02-thought-records/ui/ReviewSection.svelte` → — → — → `docs/modules/ch02.md#weekly-review-section`

## ch03 — Making room (`packages/modules/ch03-hard-feelings`)

- Module, manifest → `packages/modules/ch03-hard-feelings/index.ts`, `packages/modules/ch03-hard-feelings/manifest.ts` → `module`, `manifest` → — → `docs/modules/ch03.md`
- Records, validators → `packages/modules/ch03-hard-feelings/schema.ts` → `Defusion`, `StressEvent`, `Series`, `Session`, `Gratitude`, `SERIES_PROMPTS`, `SESSION_MINUTES`, `validateTopic`, `validateThoughtText`, `validateRating5` → `packages/modules/ch03-hard-feelings/repo.test.ts` → `docs/modules/ch03.md#records`
- Migrations → `packages/modules/ch03-hard-feelings/migrations.ts` → `migrations` → `packages/modules/ch03-hard-feelings/repo.test.ts` → `docs/modules/ch03.md#records`
- Repo → `packages/modules/ch03-hard-feelings/repo.ts` → `addDefusion`, `listDefusions`, `defusionsBetween`, `addEvent`, `updateEvent`, `rateEvent`, `deleteEvent`, `listEvents`, `eventsBetween`, `startSeries`, `activeSeries`, `listSeries`, `finishSeries`, `stopSeries`, `startSession`, `finishSession`, `sessionsForSeries`, `sessionsBetween`, `markGratitude`, `unmarkGratitude`, `gratitudeDays`, `gratitudeBetween` → `packages/modules/ch03-hard-feelings/repo.test.ts` → —
- Signals, visibility → `packages/modules/ch03-hard-feelings/signals.ts` → `signals`, `ch03SignalValues`, `eventToday`, `eventsToRate`, `seriesActive`, `daysSinceGratitude`, `reappraisalCardVisible`, `rateCardVisible`, `sessionCardVisible`, `clock`, `dayWord` → `packages/modules/ch03-hard-feelings/signals.test.ts` → `docs/modules/ch03.md#signals-published`
- Prompts → `packages/modules/ch03-hard-feelings/prompts.ts` → `prompts`, `GRATITUDE_GAP_DAYS` → `packages/modules/ch03-hard-feelings/prompts.test.ts` → `docs/modules/ch03.md#prompts`
- Suggestions → `packages/modules/ch03-hard-feelings/suggestions.ts` → `suggestions`, `REFRAME_MIN_EVENTS`, `REFRAME_MIN_RATE` → `packages/modules/ch03-hard-feelings/suggestions.test.ts` → `docs/modules/ch03.md#suggestions`
- Event reminders (morning of, 60 min before) → `packages/modules/ch03-hard-feelings/reminders.ts` → `reminders`, `eventReminders`, `PRE_EVENT_MIN`, `REAPPRAISAL_BODY` → `packages/modules/ch03-hard-feelings/reminders.test.ts` → `docs/modules/ch03.md#what-the-user-does`
- Screen view helpers (tabs, dates, event split) → `packages/modules/ch03-hard-feelings/view.ts` → `TABS`, `tabFromSearch`, `dayLabel`, `toStartsAt`, `fromStartsAt`, `splitEvents`, `HELPED_LABELS` → `packages/modules/ch03-hard-feelings/view.test.ts` → —
- Screen (four tabs) → `packages/modules/ch03-hard-feelings/ui/Ch03Screen.svelte` → — → — → `docs/modules/ch03.md#screens-and-today-cards`
- Events tab (add, edit, rate) → `packages/modules/ch03-hard-feelings/ui/EventsTab.svelte` → — → — → `docs/modules/ch03.md#what-the-user-does`
- Defuse, Writing, Gratitude tabs → `packages/modules/ch03-hard-feelings/ui/DefuseTab.svelte`, `packages/modules/ch03-hard-feelings/ui/WritingTab.svelte`, `packages/modules/ch03-hard-feelings/ui/GratitudeTab.svelte` → — → — → `docs/modules/ch03.md#what-the-user-does`
- Today card (reappraisal, morning) → `packages/modules/ch03-hard-feelings/ui/ReappraisalCard.svelte` → — → — → `docs/modules/ch03.md#screens-and-today-cards`

## dev-test (`packages/modules/dev-test`, dev builds only)

- Module, manifest → `packages/modules/dev-test/index.ts`, `packages/modules/dev-test/manifest.ts` → `module`, `manifest` → — → —
- Migrations, prompts, signals → `packages/modules/dev-test/migrations.ts`, `packages/modules/dev-test/prompts.ts`, `packages/modules/dev-test/signals.ts` → `migrations`, `prompts`, `signals` → — → —
- Suggestions → `packages/modules/dev-test/suggestions.ts` → `suggestions` → `packages/modules/dev-test/suggestions.test.ts` → —
- Today card, review section → `packages/modules/dev-test/ui/NotesCard.svelte`, `packages/modules/dev-test/ui/ReviewSection.svelte` → — → — → —
