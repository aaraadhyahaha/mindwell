export type ThemePreference = 'system' | 'day' | 'night';

// Held in memory. The app's `settings` table is the source of truth and re-applies it on start;
// the app also mirrors the preference to localStorage for the pre-paint script in app.html.
export const theme = $state<{ preference: ThemePreference }>({ preference: 'system' });

export function setTheme(p: ThemePreference): void {
  theme.preference = p;
  if (typeof document === 'undefined') return;
  if (p === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', p);
}
