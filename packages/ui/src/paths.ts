/**
 * The app may be served under a base path (GitHub Pages: `/mindwell`). Modules can't import
 * `$app/paths`, so the app sets the base once at startup and links resolve through `appHref`.
 * `Button`, `NavItem` and `Toc` resolve their `href` themselves; raw `<a>` tags call `appHref`.
 */
let basePath = '';

/** Called once by the app before the first render, with SvelteKit's `base` ('' or '/mindwell'). */
export function setBasePath(base: string): void {
  basePath = base.replace(/\/+$/, '');
}

/** Prefixes an app path (`/m/ch02`) with the base. Hashes, relative and absolute URLs pass through. */
export function appHref(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') ? basePath + path : path;
}
