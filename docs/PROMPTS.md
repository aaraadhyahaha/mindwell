# Today, prompts and signals

## Today page

Three slots, filled top to bottom by time of day: **Morning**, **Anytime**, **Evening**. Core owns the morning check-in and evening close; modules add cards.

**Morning check-in** (target < 3 min)
1. Day type, multi-select: `exam`, `heavy_study`, `stressful_event`, `social`, `light`, `busy_travel`.
2. Energy 1–5.
3. Context strip (read-only): yesterday's rating, intent result, top captured story, active series/events.
4. Intent prompt → user types one line (`days.intent_text`).
5. Up to 3 journal prompts → user writes in the paper journal, then taps *useful* / *not useful* on each (optional).

**Evening close** (target < 3 min)
1. Show the morning intent → kept / partly / not.
2. Day rating 1–5.
3. Module evening cards (e.g. today's captures).
4. Optional: one evening reflection prompt.

## Prompt definition

```ts
interface PromptDef {
  id: string;                    // 'ch02.evidence_against'
  module: string;                // 'ch02' ('core' for core prompts)
  kind: 'intent' | 'journal';
  when: 'morning' | 'evening' | 'anytime';
  technique: string;             // groups similar prompts; max one per technique per pick
  text: string;                  // may use {name}, {story}, {event}
  weight: number;                // base priority, default 1
  cooldownDays: number;          // min days before showing again
  condition: (s: Signals) => boolean; // pure
}
```

## Signals

A `Signals` snapshot is computed once when the check-in opens: a plain map `key → value` built from every active module's `SignalDef`s plus core's. Conditions and placeholders read only this snapshot.

Core signals: `day.types`, `day.energy`, `yesterday.rating`, `yesterday.intent_result`, `user.name`, `upcoming_events` (from modules that publish them), `prompt.days_since(id)` (helper), `chapters.recently_unlocked` (ids unlocked ≤ 14 days ago).

## Selection algorithm (morning; evening is the same with `when: 'evening'` and max 1 journal prompt)

1. Candidates = prompts from active modules (+ core) where `when` matches or is `anytime`, `condition(signals)` is true, and `days_since(id) >= cooldownDays` (never shown counts as ∞).
2. Score each candidate:
   - `usefulness = (useful + 1) / (rated + 2) * 2` (Laplace-smoothed, range 0–2, starts at 1)
   - `novelty = 1.25` if the prompt's module is in `chapters.recently_unlocked`, else `1`
   - `score = weight * usefulness * novelty * jitter`, where `jitter` ∈ [0.9, 1.1] from a PRNG seeded by `day + prompt.id` (stable within a day, varies across days)
3. Pick the top `intent` prompt, then up to 3 `journal` prompts in score order, skipping any whose `technique` was already picked.
4. "Show another" swaps a prompt for the next eligible one (same rules), marking the swapped one as shown.
5. Record each shown prompt in `prompts_shown`; feedback updates `prompt_scores` (`rated`, `useful`).

A prompt rated not useful repeatedly drifts toward a score near 0 but is never deleted. Fallbacks: if no intent prompt qualifies, use core `core.intent.default`; if fewer than 1 journal prompt qualifies, use `core.journal.default`.

## Core prompts (Phase 0)

| id | kind | when | text |
| --- | --- | --- | --- |
| `core.intent.default` | intent | morning | What's one thing that would make today count? |
| `core.intent.light_day` | intent | morning | It's a lighter day. What would rest well look like? (condition: `light` in day types) |
| `core.journal.default` | journal | morning | What's on your mind as the day starts? |
| `core.journal.hard_yesterday` | journal | morning | Yesterday was hard. What made it hard, and what's one thing you'd do differently? (condition: yesterday.rating ≤ 2; cooldown 3) |
| `core.evening.surprise` | journal | evening | What went differently from what you expected today? (cooldown 4) |

Placeholders: `{name}` = user's name from Settings; `{story}` = the story named by the signal the condition used; `{event}` = event title. Placeholder values come from signals only.
