import type { SettingRecord } from '@mindwell/core';
import { CORE_TABLES, NAME_SETTING } from '@mindwell/core';
import { getStore } from './db';
import type { ReminderConfig, ReminderSent } from './reminders';
import { setTheme } from '@mindwell/ui';
import type { ThemePreference } from '@mindwell/ui';

export const SETTING_KEYS = {
  name: NAME_SETTING,
  morning: 'reminder.morning',
  morningOn: 'reminder.morning.on',
  evening: 'reminder.evening',
  eveningOn: 'reminder.evening.on',
  theme: 'theme',
  sent: 'reminder.sent',
} as const;

const THEME_MIRROR_KEY = 'mindwell.theme';

/** Mirrors the theme to localStorage so app.html can apply it before first paint. */
function mirrorTheme(p: ThemePreference): void {
  try {
    localStorage.setItem(THEME_MIRROR_KEY, p);
  } catch {
    // storage unavailable: the pre-paint script just does nothing
  }
}

const THEMES: ThemePreference[] = ['system', 'day', 'night'];
const isTime = (v: unknown): v is string => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
const isDayOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string';

/** App settings over the `settings` table: one live row per key, JSON `value`. */
export class SettingsState {
  name = $state('');
  morning = $state('07:30');
  morningOn = $state(true);
  evening = $state('21:30');
  eveningOn = $state(true);
  theme = $state<ThemePreference>('system');
  sent = $state.raw<ReminderSent>({ morning: null, evening: null });
  loaded = $state(false);
  error = $state<string | null>(null);

  get reminderConfig(): ReminderConfig {
    return { morning: this.morning, morningOn: this.morningOn, evening: this.evening, eveningOn: this.eveningOn };
  }

  async load(): Promise<void> {
    try {
      const store = await getStore();
      const rows = await store.list<SettingRecord>(CORE_TABLES.settings);
      const get = (key: string): unknown => {
        const row = rows.find((r) => r.key === key);
        if (!row) return undefined;
        try {
          return JSON.parse(row.value);
        } catch {
          return undefined;
        }
      };
      const name = get(SETTING_KEYS.name);
      if (typeof name === 'string') this.name = name;
      const m = get(SETTING_KEYS.morning);
      if (isTime(m)) this.morning = m;
      const e = get(SETTING_KEYS.evening);
      if (isTime(e)) this.evening = e;
      const mo = get(SETTING_KEYS.morningOn);
      if (typeof mo === 'boolean') this.morningOn = mo;
      const eo = get(SETTING_KEYS.eveningOn);
      if (typeof eo === 'boolean') this.eveningOn = eo;
      const t = get(SETTING_KEYS.theme);
      if (THEMES.includes(t as ThemePreference)) this.theme = t as ThemePreference;
      const s = get(SETTING_KEYS.sent) as Partial<ReminderSent> | undefined;
      if (s && typeof s === 'object' && isDayOrNull(s.morning ?? null) && isDayOrNull(s.evening ?? null)) {
        this.sent = { morning: s.morning ?? null, evening: s.evening ?? null };
      }
      setTheme(this.theme);
      mirrorTheme(this.theme); // the Store value wins over any stale mirror
      this.loaded = true;
    } catch {
      this.error = 'Could not load your settings. Please try again.';
    }
  }

  /** Writes one key: updates its live row or inserts one. Returns false on failure. */
  async save(key: string, value: unknown): Promise<boolean> {
    try {
      const store = await getStore();
      const json = JSON.stringify(value);
      const [row] = await store.list<SettingRecord>(CORE_TABLES.settings, { where: { key }, limit: 1 });
      if (row) await store.update<SettingRecord>(CORE_TABLES.settings, row.id, { value: json });
      else await store.insert<SettingRecord>(CORE_TABLES.settings, { key, value: json });
      this.error = null;
      return true;
    } catch {
      this.error = 'Could not save that. Please try again.';
      return false;
    }
  }

  saveName(): Promise<boolean> {
    this.name = this.name.trim();
    return this.save(SETTING_KEYS.name, this.name);
  }
  saveMorning(): Promise<boolean> {
    return this.save(SETTING_KEYS.morning, this.morning);
  }
  saveEvening(): Promise<boolean> {
    return this.save(SETTING_KEYS.evening, this.evening);
  }
  setMorningOn(on: boolean): Promise<boolean> {
    this.morningOn = on;
    return this.save(SETTING_KEYS.morningOn, on);
  }
  setEveningOn(on: boolean): Promise<boolean> {
    this.eveningOn = on;
    return this.save(SETTING_KEYS.eveningOn, on);
  }
  setThemePref(p: ThemePreference): Promise<boolean> {
    this.theme = p;
    setTheme(p);
    mirrorTheme(p);
    return this.save(SETTING_KEYS.theme, p);
  }
  async markSent(kind: 'morning' | 'evening', day: string): Promise<boolean> {
    this.sent = { ...this.sent, [kind]: day };
    return this.save(SETTING_KEYS.sent, this.sent);
  }
}

export const settings = new SettingsState();
