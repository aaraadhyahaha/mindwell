import { invoke } from '@tauri-apps/api/core';
import type { SettingRecord } from '@mindwell/core';
import { CORE_TABLES } from '@mindwell/core';
import { getStore } from './db';
import { settings } from './settings.svelte';
import { activation } from './activation.svelte';

export const CAPTURE_SHORTCUT_SETTING = 'capture.shortcut';
export const DEFAULT_CAPTURE_SHORTCUT = 'Super+Shift+N';

export type CaptureInfo = { command: string; wayland: boolean };

class CaptureState {
  /** Bumped each time the capture window is asked to open; the module route keys on it. */
  openCount = $state(0);
  shortcut = $state(DEFAULT_CAPTURE_SHORTCUT);
  error = $state<string | null>(null);
}

export const capture = new CaptureState();

const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function captureInfo(): Promise<CaptureInfo | null> {
  if (!inTauri()) return null;
  try {
    return await invoke<CaptureInfo>('capture_info');
  } catch {
    return null;
  }
}

async function register(accelerator: string | null): Promise<void> {
  if (!inTauri()) return;
  try {
    await invoke('set_capture_shortcut', { accelerator });
    capture.error = null;
  } catch (e) {
    capture.error = typeof e === 'string' ? e : 'Could not register that shortcut.';
  }
}

async function loadShortcut(): Promise<void> {
  try {
    const store = await getStore();
    const [row] = await store.list<SettingRecord>(CORE_TABLES.settings, {
      where: { key: CAPTURE_SHORTCUT_SETTING },
      limit: 1
    });
    if (row) {
      const v = JSON.parse(row.value);
      if (typeof v === 'string' && v.trim()) capture.shortcut = v;
    }
  } catch {
    // keep the default
  }
}

/** Saves a new accelerator and re-registers it (when Chapter 1 is active). */
export async function saveShortcut(value: string): Promise<void> {
  capture.shortcut = value.trim() || DEFAULT_CAPTURE_SHORTCUT;
  await settings.save(CAPTURE_SHORTCUT_SETTING, capture.shortcut);
  await register(activation.active.some((m) => m.manifest.id === 'ch01') ? capture.shortcut : null);
}

/** Main window only: keeps the OS registration in step with ch01 being active. Returns a stop function. */
export function startCaptureSync(): () => void {
  let loaded = false;
  const root = $effect.root(() => {
    $effect(() => {
      const on = activation.active.some((m) => m.manifest.id === 'ch01');
      const accel = capture.shortcut;
      if (!loaded) return;
      void register(on ? accel : null);
    });
  });
  void loadShortcut().then(() => {
    loaded = true;
    capture.shortcut = capture.shortcut; // re-trigger the effect now that the saved value is known
  });
  return root;
}
