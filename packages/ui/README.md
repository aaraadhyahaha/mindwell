# @mindwell/ui

The design system from `docs/DESIGN.md`: tokens, bundled fonts (OFL, in `src/fonts/`), base styles and components. The app and chapter modules import it; it imports nothing from the app or any module.

- Components: `import { Page, Card, PromptCard, … } from '@mindwell/ui'`
- Styles (the app shell imports these once): `@mindwell/ui/fonts.css`, `@mindwell/ui/tokens.css`, `@mindwell/ui/base.css`
