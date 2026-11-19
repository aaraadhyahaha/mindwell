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
- [ ] Cannot start a 4th active experiment; message explains why (focus).
- [ ] Ending day shows the verdict card; verdict stored; extend moves `end_day`.
- [ ] Inactive module's techniques are not offered.

## Build checklist
- [ ] [builder] migrations + schema + repo
- [ ] [tester] signals, prompt conditions, suggestions
- [ ] [builder] screen, Today card, review section
- [ ] [main] register, end-to-end check
