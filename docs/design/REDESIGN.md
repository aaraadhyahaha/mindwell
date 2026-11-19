# Redesign: approved mockups

The files in `docs/design/mockups/` are the **approved design**. Match them exactly: layout, spacing, sizes, colours, type, copy style and component shapes. When the mockup and DESIGN.md disagree, the mockup wins; update DESIGN.md to match.

| Mockup | App screen |
| --- | --- |
| `today.html` | Today (morning check-in state) |
| `thoughts.html` | ch01 module screen (`/m/ch01`) |
| `library.html` | Library |
| `capture.html` | Capture window (560 × 240) |

Open any file in a browser to view it. Mockups load fonts from Google Fonts only for preview; **the app bundles the same fonts locally**.

## Fonts (exact)

- Serif, used for every serif element including the `mindwell` wordmark: **Tinos** (Apache 2.0; metric-compatible with Times New Roman). Regular, Bold, Italic, Bold Italic. Stack: `'Tinos', 'Times New Roman', serif`. Literata is retired: remove its files and references.
- Sans: **Schibsted Grotesk** (400/500/600/700).
- Match every font size, weight, style and letter-spacing in the mockup CSS exactly.

## Shell (applies to every screen)

- Full-window layout: 252px sidebar + fluid main. No centred narrow page with top text nav.
- Sidebar: wordmark, sections (Daily, Practice, The book), nav rows with 18px stroke icons, selected row = accent-soft fill + accent text, book table of contents under Library (dot = chapter read), Settings pinned to the bottom. Counts on Experiments/Thoughts come from data.
- Toolbar (58px, bottom rule): running head on the left (small caps + italic Literata subtitle), the screen's main action on the right.
- Window background is solid `--bg`. **No window transparency or blur.**

## Patterns to reuse on screens not mocked up (Week, Experiments, Settings, ch02/ch03)

- Chapter opener: label → Literata 42px title → italic lede → 48px rule.
- Two-column pages: main column + "margin" column (left rule, small-caps labels, Literata notes) or a two-up layout like Thoughts.
- Lists are ruled rows (1px `--rule` between rows), not boxes inside boxes. Cards only for a focused side panel (Library detail).
- Steps numbered with italic roman numerals (i., ii., iii.) in the accent colour.
- Dates in words ("Today", "Yesterday", "Thursday, 19 November"), never ISO.
- Icon buttons 44px with `aria-label`.

## Known issues to fix while rebuilding

1. Replace Literata with bundled Tinos everywhere (see Fonts). Verify with the browser dev tools that the rendered font is Tinos, not a system fallback.
2. The window is translucent (desktop shows through). Make it opaque.
3. Week view shows "Could not load your week".
4. Settings shows the raw debug binary path; show a short command and a "copy" button instead.
