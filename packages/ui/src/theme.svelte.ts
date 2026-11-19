export type ThemePreference = 'system' | 'day' | 'night';

// Held in memory; the app's Settings store persists it through the Store and re-applies it on start.
export const theme = $state<{ preference: ThemePreference }>({ preference: 'system' });

export function setTheme(p: ThemePreference): void {
  theme.preference = p;
  if (typeof document === 'undefined') return;
  if (p === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', p);
}
