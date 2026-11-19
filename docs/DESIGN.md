# Design

mindwell should feel like a companion to the book: calm, typographic, quiet. It should feel like a well-set page, not a productivity dashboard.

## Tokens

| Token | Day ("Paper") | Night |
| --- | --- | --- |
| `--bg` | `#F5F0E6` | `#1A1815` |
| `--side` (sidebar) | `#ECE5D6` | `#15130F` |
| `--surface` | `#FBF8F2` | `#221F1B` |
| `--ink` | `#1F1B16` | `#E8E0D2` |
| `--muted` | `#655D52` | `#9A9082` |
| `--placeholder` | `#8C8376` | `#7A7266` |
| `--rule` | `#D9D0C1` | `#3A352E` |
| `--accent` | `#3E5C58` (deep sea-green) | `#8FB3AC` |
| `--accent-soft` | `#E3EAE6` | `#2C3A37` |
| `--on-accent` (text on accent fill) | `#FBF8F2` | `#1A1815` |

The approved mockups in `docs/design/mockups/` are the source of truth for every size, weight, colour and spacing; when this file and a mockup disagree, the mockup wins and this file is updated. Components copy the mockup CSS values literally (e.g. 14.5px, .14em) rather than rounding to a scale.

One accent only, used for the primary action and focus rings. No other colours except greys from these tokens. Follow the system light/dark setting, with a manual override.

**Type** (fonts bundled in `packages/ui/src/fonts/`, OFL, never loaded from the web; the app imports `@mindwell/ui/fonts.css`, `/tokens.css` and `/base.css` once in `+layout.svelte`)
- Serif: Tinos (OFL; static Regular, Bold, Italic, Bold Italic; metric-compatible with Times New Roman) for every serif element, including the `mindwell` wordmark. Stack: `'Tinos', 'Times New Roman', serif`. Only weights 400 and 700 exist; never ask for 500/600 in serif.
- Sans: Source Sans 3 (variable, OFL; 400/500/600/700) for UI text, labels, buttons, numbers.
- In `pnpm dev` the fonts are fetched from `packages/ui` by URL, so `apps/desktop/vite.config.js` allows `packages/` in `server.fs.allow`. Check with `node scripts/design-shots.mjs fonts <path> <selector>` that the rendered font is the bundled file, not a system fallback.
- Body: Source Sans 3 15px / 1.5. Serif is set explicitly on titles, prompts, intentions, notes and numerals.
- Section labels (`SectionLabel`): sans 11px, weight 600, uppercase, letter-spacing .14em, `--muted` (the book's small-caps look).

**Space and radii:** copy the mockup values (common steps 4 / 8 / 10 / 12 / 16 / 22 / 28 / 44 px). Radii: 999px pills and tags, 10px the segmented scale, 9px buttons, icon buttons and boxed inputs, 8px nav rows, 6px cards and TOC rows.

## Shell (every screen)

The window is opaque: `--bg` edge to edge, no transparency or blur. (On Hyprland a global `active_opacity` still fades every window; that is fixed by a compositor window rule for `app.mindwell.desktop`, not by the app.)

- `Shell`: full-window grid, 252px sidebar + fluid main column (`100vh`; the main column scrolls, the sidebar stays).
- `Sidebar` (`--side`, 1px right rule, padding 22/12/14): wordmark `mindwell` (Tinos italic 24px, -0.01em) over the subtitle "a companion to Clear Mind, Steady Work" (Tinos italic 12px, muted), rule below; then `NavLabel` sections Daily · Practice · The book; `footer` pins Settings to the bottom.
- `NavItem`: 36px row, 18px stroke icon (`Icon`, 1.5 stroke, muted), 14.5px/500 label, optional count (12px muted, right). Current row: `--surface` fill + 1px `--rule` ring, weight 600, icon in accent. Practice rows are module screens with `inNav`; their icon and count come from `ScreenDef.icon` / `ScreenDef.navCount(signals)`.
- `Toc`: the book's chapters under Library (Introduction "·", then numbers in Tinos 13px), 13.5px muted; a read chapter is ink with a 6px accent dot.
- `Toolbar`: 58px, bottom rule, padding 0 40px, sticky. Running head on the left: 11px/600 uppercase .16em muted, then the italic Tinos 14px subtitle 10px after it. The screen's main action on the right (`Button variant="secondary"`, with `Kbd` for a shortcut).

## Components (in `packages/ui/src/`, package `@mindwell/ui`)

Shell: `Shell` · `Sidebar` · `NavLabel` · `NavItem` · `Toc` · `Toolbar` · `Icon` (mockup stroke icons) · `Kbd`.

Page and content (values copied from `today.html`):
- `Page`: content under the toolbar, padding 52/64/72. Chapter opener: label (11px/600 uppercase .14em muted) → title Tinos 42px/1.12, -0.015em, 10px above → optional lede Tinos italic 18px muted, max 560px → 48px 1px ink rule (28px above, 40px below). With `margin`, a two-column grid: main `minmax(0, 660px)` + 280px margin, 80px gap, centred; the margin column has a 1px left rule, 32px padding and an "In the margin" label. Below 1220px window width the margin moves under the main column.
- `Step`: italic roman numeral (Tinos 16px, accent) + Tinos 20px heading; 44px below each step.
- `Choice`: pills 38px, radius 999, surface + rule, 500 14px; selected = accent-soft fill, accent border and text, 600. 16px below the heading. `labelledby` hides the built-in label when a `Step` names it.
- `Scale` (1–5): one segmented control, max 400px, radius 10, 44px cells in Tinos 17px split by rules; selected = accent fill. End labels Tinos italic 12.5px muted. `labelledby` as for `Choice`.
- `Field`: boxed (radius 9, surface) or `variant="line"`: Tinos 20px on a 1px ink underline, placeholder italic `--placeholder`; label in small caps, hint 12.5px muted.
- `Ornament`: rule · four-point star · rule (36px below), between the check-in's basics and its prompts.
- `Epigraph`: a set-off prompt in Tinos italic 23px/1.42, 28px indent, hanging accent quote mark (Tinos 56px); its source line 12.5px muted.
- `PromptList` + `PromptCard`: ruled rows (1px rule above the list and under each row, 22px padding), columns 44px numeral (Tinos 30px accent) · Tinos 19px/1.45 text with a 12.5px source line · three 44px `IconButton`s (Useful ✓, Not useful ✕, Show another ↻); pressed = accent-soft fill + accent ring.
- `IconButton`: 44px square, radius 9, 18px icon, `aria-label` required.
- Margin: `MarginNote` (label and every paragraph in Tinos 15px/1.5; the label bold small caps .14em muted; `<p class="meta">` Tinos 12.5px muted; 30px apart) · `RatingDots` (11px dots, 1.25px ink ring, filled = ink) · `Tag` (600 11.5px pill, accent-soft) · `Meter` (3px rule track with accent fill; with `label`, an italic serif label and count above it).
- Also: `SectionLabel` (11px/600 small caps) · `Card` (surface, 1px `--rule` border, no shadow; only for a focused side panel) · `Button` (600 14px; primary = accent fill 44px / padding 22, secondary = surface + rule outline 38px / padding 16, quiet = accent text; radius 9; optional `href` and leading `icon`) · `WhySheet` (manifest drawer) · `LineChart` (thin 1.5px ink line, direct labels, no legend boxes).

## Patterns

- **Chapter opener** at the top of every page (`Page`): label → 42px serif title → italic lede → 48px rule.
- **Two columns**: main column + margin column (`Page` with `margin`), or a two-up layout like Thoughts.
- **Lists** are ruled rows (1px `--rule` between rows), not boxes inside boxes. Cards only for a focused side panel.
- **Steps** are numbered with italic roman numerals (i., ii., iii.) in the accent colour.
- **Dates** in words ("Today", "Yesterday", "Thursday, 19 November"), never ISO.
- **Today** follows `today.html`: running head "Thursday, 19 November" + the part of the day; "Capture a thought" with its shortcut in the toolbar; steps i–iv; footer "Saved as you go." + the primary action; the margin column with Yesterday, module notes and Coming up.
- **Empty states** explain what will appear and why, in one line ("Captured thoughts will gather here through the day.").
- **Motion:** 150–200 ms fades only. No bounce, slide-ins, confetti, or celebration.
- **Keyboard:** everything reachable without a mouse; the capture window opens focused and submits with Enter, closes with Esc.

## Never

Gradients · glass/blur effects · drop shadows beyond 1px borders · emoji · motivational quotes · streak counters · red warning states for missed days · more than one accent colour.

## Process

Before building screens in Phase 0, build `/styleguide` (dev-only route) showing every token and component. Review it, then build screens from it.
