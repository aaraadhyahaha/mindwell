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

**Space:** 4 px base; common steps 8 / 12 / 16 / 24 / 40 / 64. Reading column max 64ch, centred. Radius 6 px for cards and inputs, 999px only for pills.

## Shell (every screen)

The window is opaque: `--bg` edge to edge, no transparency or blur. (On Hyprland a global `active_opacity` still fades every window; that is fixed by a compositor window rule for `app.mindwell.desktop`, not by the app.)

- `Shell`: full-window grid, 252px sidebar + fluid main column (`100vh`; the main column scrolls, the sidebar stays).
- `Sidebar` (`--side`, 1px right rule, padding 22/12/14): wordmark `mindwell` (Tinos italic 24px, -0.01em) over the subtitle "a companion to Clear Mind, Steady Work" (Tinos italic 12px, muted), rule below; then `NavLabel` sections Daily · Practice · The book; `footer` pins Settings to the bottom.
- `NavItem`: 36px row, 18px stroke icon (`Icon`, 1.5 stroke, muted), 14.5px/500 label, optional count (12px muted, right). Current row: `--surface` fill + 1px `--rule` ring, weight 600, icon in accent. Practice rows are module screens with `inNav`; their icon and count come from `ScreenDef.icon` / `ScreenDef.navCount(signals)`.
- `Toc`: the book's chapters under Library (Introduction "·", then numbers in Tinos 13px), 13.5px muted; a read chapter is ink with a 6px accent dot.
- `Toolbar`: 58px, bottom rule, padding 0 40px, sticky. Running head on the left: 11px/600 uppercase .16em muted, then the italic Tinos 14px subtitle 10px after it. The screen's main action on the right (`Button variant="secondary"`, with `Kbd` for a shortcut).

## Components (in `packages/ui/src/`, package `@mindwell/ui`)

`Shell` · `Sidebar` · `NavLabel` · `NavItem` · `Toc` · `Toolbar` · `Icon` (mockup stroke icons) · `Kbd` · `Page` (column + chapter-opener header) · `SectionLabel` · `Card` (surface, 1px `--rule` border, no shadow) · `PromptCard` (serif text, useful / not-useful / show another) · `Field` (label + input/textarea) · `Scale` (1–5 or 0–100, tap or keyboard) · `Choice` (pills, single/multi) · `Button` (600 14px; primary = accent fill 44px / padding 22, secondary = surface + rule outline 38px / padding 16, quiet = accent text; radius 9; optional `href` and leading `icon`) · `WhySheet` (manifest drawer) · `LineChart` (thin 1.5px ink line, direct labels, no legend boxes).

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
