# intro — Introduction: Experiments

**Idea:** Treat every practice as an experiment: try it honestly for a few weeks, then keep what works.
**Evidence:** Psychology findings are averages; a technique that helps most people may do little for you, and some famous effects shrank on replication. Testing techniques on yourself is the only way to know.
**References:** Introduction of *Clear Mind, Steady Work*.

## What the user does
1. Starts an experiment: picks a technique (from any active module's `experiments`), writes a one-line hypothesis, picks a length (default 21 days).
2. Each week (at the weekly review) rates "Is this helping?" 1–5 with an optional note.
3. At the end: verdict **keep**, **drop** or **extend** (+7/14 days), with a note.

## Records
| Table | Fields | Notes |
| --- | --- | --- |
| `intro_experiments` | `technique`, `module`, `hypothesis`, `start_day`, `end_day`, `status` (active/ended), `verdict` (keep/drop/extend/null), `note` | max 3 active at once |
| `intro_checkins` | `experiment_id`, `day`, `rating` (1–5), `note` | one per experiment per week |

## Screens and Today cards
- Screen `/m/intro`: active experiments (days left, check-in sparkline), past experiments with verdicts, "Start an experiment".
- Today card (morning slot), visible when an experiment ends today or ended without a verdict: "Your experiment with {technique} has finished. Keep, drop or extend?"
- Today margin note (`margin` slot, order 40), visible while an experiment runs: "Experiment", its label, "Day N of M" and a progress bar (`experimentProgress`).
- Sidebar: Experiments shows the number running (`experimentsNavCount`).

## Signals published
| Key | Value | Meaning |
| --- | --- | --- |
| `intro.active` | `{technique, days_left}[]` | running experiments |
| `intro.ending_within_3d` | `boolean` | any experiment ends in ≤ 3 days |
| `intro.awaiting_verdict` | `number` | ended experiments without a verdict |

## Prompts
| id | kind | when | technique | text | condition | cooldown |
| --- | --- | --- | --- | --- | --- | --- |
| `intro.verdict_reflect` | journal | evening | experiment | What did {technique} change for you, and what didn't it? | `intro.awaiting_verdict > 0` | 2 |
| `intro.mid_check` | journal | morning | experiment | Halfway through trying {technique}: what are you noticing so far? | an experiment is at its midpoint day | 7 |

## Weekly review section
"Experiments": one check-in row per active experiment (rating + note), plus verdicts due.

## Suggestions
| id | When it fires | Text |
| --- | --- | --- |
| `intro.low_ratings` | last 2 check-ins ≤ 2 | "{technique} hasn't been helping for two weeks. End it early?" |
| `intro.try_new` | a module unlocked ≥ 7 days ago has no experiment ever run | "You unlocked Chapter {n} a week ago. Try one of its techniques as an experiment?" |

## Experiments offered
None of its own.

## Acceptance checks
- [x] Cannot start a 4th active experiment; message explains why (focus).
- [x] Ending day shows the verdict card; verdict stored; extend moves `end_day`.
- [x] Inactive module's techniques are not offered.

## Build checklist
- [x] [builder] migrations + schema + repo
- [x] [tester] signals, prompt conditions, suggestions
- [x] [builder] screen, Today card, review section
- [x] [main] register, end-to-end check

## Implementation notes
Decisions made while building Phase 1. Where these notes add to the tables above, they win.

- **Package:** `packages/modules/intro-experiments/`, name `@mindwell/module-intro`, id `intro`, chapter 0.
- **Extra column:** `intro_experiments.label` is the technique's label, copied at start, so past experiments still read well if the offering module goes inactive.
- **Days:** an experiment of length N runs `start_day … end_day`, both included: `end_day = start_day + N − 1`. `days_left = daysBetween(day, end_day)` (0 on the last day). The **midpoint** is `start_day + floor((end_day − start_day) / 2)`.
- **Status:** `active` until a keep or drop verdict, then `ended`. **Awaiting verdict** means `status = 'active'` and `end_day ≤ day`. Extend adds 7 or 14 days to `end_day`, sets `verdict = 'extend'`, keeps the experiment `active` and appends the note. Keep or drop sets `verdict`, `note` and `status = 'ended'`. "End early" sets `end_day = day`, so the verdict card appears.
- **Max 3 active** counts every `active` row, including ones awaiting a verdict. `startExperiment` throws `ExperimentLimitError` and the screen says: "Three experiments are running. End one first: with fewer at once, each result is easier to read."
- **What can be started:** a technique comes from core's `experiments.available` signal (active modules only), minus techniques that already have an `active` experiment.
- **Check-ins:** one per experiment per review week. Saving again within the 7 days ending on the review day updates that row instead of adding one.
- **Signals** (all read `intro_*` tables through the Store; experiment data is live rows only):
  - `intro.active`: `{id, module, technique, label, start_day, end_day, days_left, recent_ratings}[]` for every `active` row. `recent_ratings` holds up to the last 2 check-in ratings, oldest first.
  - `intro.ending_within_3d`: any active row with `0 ≤ days_left ≤ 3`.
  - `intro.awaiting_verdict`: a number. `intro.verdict_due`: `{id, technique, label}[]`, the same rows ordered by `end_day`.
  - `intro.midpoint_today`: the label of the first active experiment whose midpoint is today, else `null`.
  - `intro.modules_tried`: the distinct `module` values over all experiments, ever.
- **Prompts:** `{technique}` is filled with the label. `verdict_reflect` uses `verdict_due[0]`. `mid_check` has the condition `midpoint_today` non-null.
- **Suggestions:**
  - `intro.low_ratings` takes the first active experiment whose `recent_ratings` has 2 entries, both ≤ 2. Key `intro.low_ratings:<experiment id>`.
  - `intro.try_new` takes the lowest chapter in `chapters.read` with `read_day ≤ day − 7`, at least one entry in `experiments.available`, and its module not in `intro.modules_tried`. Key `intro.try_new:<module>`, with `{n}` = the chapter.
- **Screen:** `path: ''`, title "Experiments", `inNav: true`.
