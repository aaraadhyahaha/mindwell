import { getCurrentWindow } from '@tauri-apps/api/window';

/** Label of the always-on-top capture window (see src-tauri). */
export const CAPTURE_WINDOW = 'capture';

/** This webview's window label, or 'main' outside Tauri (plain browser dev). */
export function windowLabel(): string {
  try {
    return getCurrentWindow().label;
  } catch {
    return 'main';
  }
}

/** True in a small extra window that shows one screen without the app chrome. */
export function isAuxWindow(): boolean {
  return windowLabel() !== 'main';
}
