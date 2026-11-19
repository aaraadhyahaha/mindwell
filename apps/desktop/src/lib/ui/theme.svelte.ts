export type ThemePreference = 'system' | 'day' | 'night';

// In-memory only: Settings will persist this through the Store later (no localStorage).
export const theme = $state<{ preference: ThemePreference }>({ preference: 'system' });

export function setTheme(p: ThemePreference): void {
  theme.preference = p;
  if (typeof document === 'undefined') return;
  if (p === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', p);
}
