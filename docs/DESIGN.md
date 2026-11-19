# Design

mindwell should feel like a companion to the book: calm, typographic, quiet. It should feel like a well-set page, not a productivity dashboard.

## Tokens

| Token | Day ("Paper") | Night |
| --- | --- | --- |
| `--bg` | `#F5F0E6` | `#1A1815` |
| `--surface` | `#FBF8F2` | `#221F1B` |
| `--ink` | `#1F1B16` | `#E8E0D2` |
| `--muted` | `#6B6358` | `#9A9082` |
| `--rule` | `#D9D0C1` | `#3A352E` |
| `--accent` | `#3E5C58` (deep sea-green) | `#8FB3AC` |
| `--accent-soft` | `#E3EAE6` | `#2C3A37` |

One accent only, used for the primary action and focus rings. No other colours except greys from these tokens. Follow the system light/dark setting, with a manual override.

**Type** (fonts bundled in `packages/ui/src/fonts/`, OFL, never loaded from the web; the app imports `@mindwell/ui/fonts.css`, `/tokens.css` and `/base.css` once in `+layout.svelte`)
- Serif: Tinos (OFL; static Regular, Bold, Italic, Bold Italic; metric-compatible with Times New Roman) for every serif element, including the `mindwell` wordmark. Stack: `'Tinos', 'Times New Roman', serif`. Only weights 400 and 700 exist; never ask for 500/600 in serif.
- Sans: Source Sans 3 (variable, OFL; 400/500/600/700) for UI text, labels, buttons, numbers.
- In `pnpm dev` the fonts are fetched from `packages/ui` by URL, so `apps/desktop/vite.config.js` allows `packages/` in `server.fs.allow`. Check with `node scripts/design-shots.mjs fonts <path> <selector>` that the rendered font is the bundled file, not a system fallback.
- Scale (px): 12 · 14 · 16 (body) · 19 · 24 · 32. Line height 1.5 body, 1.25 headings.
- Section labels: sans, 12 px, uppercase, letter-spacing 0.12em, `--muted` (the book's small-caps look).

**Space:** 4 px base; common steps 8 / 12 / 16 / 24 / 40 / 64. Reading column max 64ch, centred. Radius 6 px for cards and inputs, 999px only for pills.

## Components (in `packages/ui/src/`, package `@mindwell/ui`)

`Page` (column + chapter-opener header) · `SectionLabel` · `Card` (surface, 1px `--rule` border, no shadow) · `PromptCard` (serif text, useful / not-useful / show another) · `Field` (label + input/textarea) · `Scale` (1–5 or 0–100, tap or keyboard) · `Choice` (pills, single/multi) · `Button` (primary = accent fill, secondary = outline, quiet = text) · `WhySheet` (manifest drawer) · `LineChart` (thin 1.5px ink line, direct labels, no legend boxes).

## Patterns

- **Chapter opener** at the top of each module page: section label "CHAPTER 2", serif title 24px, a 40px thin rule.
- **Prompts** are the visual centre of Today: serif 19px, generous space around them.
- **Empty states** explain what will appear and why, in one line ("Captured thoughts will gather here through the day.").
- **Motion:** 150–200 ms fades only. No bounce, slide-ins, confetti, or celebration.
- **Keyboard:** everything reachable without a mouse; the capture window opens focused and submits with Enter, closes with Esc.

## Never

Gradients · glass/blur effects · drop shadows beyond 1px borders · emoji · motivational quotes · streak counters · red warning states for missed days · more than one accent colour.

## Process

Before building screens in Phase 0, build `/styleguide` (dev-only route) showing every token and component. Review it, then build screens from it.
