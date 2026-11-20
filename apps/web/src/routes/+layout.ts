import { base } from '$app/paths';
import { setBasePath } from '@mindwell/ui';

// SPA: no SSR. adapter-static with a fallback to index.html serves every route from the one page.
// See: https://svelte.dev/docs/kit/single-page-apps
export const ssr = false;

// Links in modules and ui components resolve against the base path (see @mindwell/ui paths.ts).
setBasePath(base);
