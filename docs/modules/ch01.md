# ch01 — Chapter 1: Why negativity sticks (Notice and name)

**Idea:** You can't erase negative thoughts, and fighting them backfires. Notice them, name them, and carry on.
**Evidence:** The brain weights bad over good (Baumeister et al., 2001). Suppressing a thought makes it return more (Wegner et al., 1987). Putting a feeling into words reduces amygdala activity (Lieberman et al., 2007).
**References:** Baumeister et al. 2001; Wegner et al. 1987; Lieberman et al. 2007.

## What the user does
1. Presses the global shortcut (default `Super+Shift+N`, changeable) anywhere. A small window opens: "There's the ___ thought." Types a few words, optional intensity 1–5, Enter. Under 5 seconds.
2. Links captures to named **stories** (recurring thoughts like "not good enough"). On save, the app suggests a story whose past captures share words; the user confirms, picks another, or creates one. Linking can also be done later in the evening.
3. Evening: sees today's captures grouped by story.

## Records
| Table | Fields | Notes |
| --- | --- | --- |
| `ch01_stories` | `name`, `first_seen_day`, `archived` | user-named |
| `ch01_captures` | `text`, `story_id` (nullable), `intensity` (1–5, nullable), `captured_at`, `day` | |

## Screens and Today cards
- Capture window (separate small Tauri window, always-on-top, opened by shortcut).
- Screen `/m/ch01`: stories list (count last 7 / 30 days, trend), capture history by day.
- Today card (anytime): "Capture a thought" button + shortcut hint.
- Today card (evening), visible when captures today > 0: today's captures grouped by story; unlinked ones show "link to story".

## Signals published
| Key | Value | Meaning |
| --- | --- | --- |
| `ch01.captures_yesterday` | `number` | |
| `ch01.top_story_7d` | `{id, name, count} \| null` | most-captured story in last 7 days |
| `ch01.story_counts_7d` | `{id, name, count}[]` | for other modules' conditions |
| `ch01.repeating_story` | `{id, name, days} \| null` | a story captured on ≥ 5 of the last 7 days |

## Prompts
| id | kind | when | technique | text | condition | cooldown |
| --- | --- | --- | --- | --- | --- | --- |
| `ch01.intent.notice` | intent | morning | notice | Today, notice and name thoughts instead of arguing with them. | `ch01.captures_yesterday >= 3` | 3 |
| `ch01.top_story_origin` | journal | morning | story_reflect | "{story}" showed up most this week. When did that thought first start appearing in your life? | `top_story_7d.count >= 3` | 7 |
| `ch01.quiet_day` | journal | evening | notice | Which thoughts came up today that you didn't capture? Name them now. | `day.types` includes `stressful_event` or `exam` | 3 |

## Weekly review section
"Your stories this week": top 5 stories, count this week vs last week, first-seen date.

## Suggestions
| id | When it fires | Text |
| --- | --- | --- |
| `ch01.unlinked` | ≥ 5 unlinked captures this week | "5 captures aren't linked to a story yet. Name the pattern?" |
| `ch01.fading` | a story's count fell ≥ 50% vs the previous 2 weeks | "'{story}' showed up half as often this fortnight." (evidence, no action) |

## Experiments offered
| technique | label | default days |
| --- | --- | --- |
| `notice_name` | Notice and name daily | 21 |

## Acceptance checks
- [ ] (verify by hand) Shortcut opens capture in < 300 ms with the input focused; Enter saves, Esc closes.
- [ ] (verify by hand) Capture works when the main window is closed (app in tray).
- [x] Story suggestion never auto-links without confirmation.

## Build checklist
- [x] [builder] migrations + schema + repo + story-match helper (word overlap)
- [x] [tester] signals, conditions, suggestions, story-match helper
- [x] [builder] capture window + global shortcut (Rust: register shortcut, show window)
- [x] [builder] screen, Today cards, review section
- [x] [main] register, end-to-end check

## Implementation notes
Decisions made while building Phase 1. Where these notes add to the tables above, they win.

- **Package:** `packages/modules/ch01-notice-name/`, name `@mindwell/module-ch01`, id `ch01`, chapter 1.
- **Screens:**
  - `path: ''` is "Thoughts" (`inNav: true`).
  - `path: 'capture'` is "Capture" (`inNav: false`). It is the capture form, and the capture window loads it.
  - The Today card's "Capture a thought" links to `/m/ch01/capture` in the main window.
- **Leaving capture:** modules can't import Tauri. When the capture form is done (saved, or Esc), it dispatches `window.dispatchEvent(new CustomEvent('mindwell:done'))`. The shell handles it: the capture window hides itself; the main window goes back to Today.
- **Capture flow:**
  1. The input is focused on mount. Intensity 1–5 is optional (keys 1–5 while the text is empty, or click).
  2. Enter saves. If the story matcher finds a match, one line appears: "Link to '{story}'?" with **Link** (Enter), **Other story** (a select) and **New story** (a name field). Esc leaves the capture unlinked and closes.
  3. With no match, the form closes right after saving. It never links without a click or Enter on the suggestion.
- **Story match** (`storyMatch.ts`, pure):
  - Words are lowercased, split on non-letters, keeping words of ≥ 3 letters minus a small stopword list.
  - A story's score is the number of distinct words the new text shares with the story's name plus its past captures' texts. Archived stories are skipped.
  - The best score ≥ 1 wins. A tie goes to the story with the most recent capture.
- **Windows:**
  - `src-tauri` creates the `capture` window hidden at startup: 460×170, no decorations, always on top, skip taskbar, URL `/m/ch01/capture`. Showing it is then instant.
  - Opening it means show, focus, then emit `capture:open` to that window. The shell remounts the form on that event, so each open starts empty with the input focused.
  - A close request on the capture window hides it.
- **Triggers:**
  - **Global shortcut** (`tauri-plugin-global-shortcut`) on X11, macOS and Windows. The accelerator lives in core `settings` under key `capture.shortcut` (JSON string, default `"Super+Shift+N"`). The main window registers it through the Rust command `set_capture_shortcut` while ch01 is active, and clears it otherwise.
  - **`mindwell --capture`** (`tauri-plugin-single-instance`). With the app running, a second launch forwards its args and the running instance opens capture. Without it, the app starts in the tray (main window hidden) and opens capture.
  - Settings shows the exact command, built from the Rust command `capture_info` (executable path, or `$APPIMAGE`), e.g. `bind = SUPER SHIFT, N, exec, /usr/bin/mindwell --capture`. On Wayland it says the global shortcut may not fire there, so bind the command in the compositor.
- **Extra signals:**
  - `ch01.captures_today` (number) sets the evening card's visibility.
  - `ch01.unlinked_7d` (number) feeds `ch01.unlinked`.
  - `ch01.story_fortnights` is `{id, name, current, previous}[]`. `current` counts captures over `day−13 … day`; `previous` over `day−27 … day−14`.
- **Windows of days:** "last 7 days" means `day−6 … day`. `top_story_7d` breaks ties by name. `repeating_story` counts distinct capture days in that window.
- **Suggestions:**
  - `ch01.unlinked` fires at `unlinked_7d ≥ 5`, with the real count in the text. Key `ch01.unlinked:<day>`.
  - `ch01.fading` takes the first story with `previous ≥ 4` and `current ≤ previous / 2`. Key `ch01.fading:<story id>:<day>`.
- **Prompt fill:** `{story}` is `top_story_7d.name`.
