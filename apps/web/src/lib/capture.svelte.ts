import { goto } from '$app/navigation';
import { activation } from '$lib/activation.svelte';

/** Key (with no modifier) that opens capture anywhere in the app. */
export const CAPTURE_KEY = 'N';

class CaptureState {
  /** Bumped each time capture is asked to open; the module route keys on it. */
  openCount = $state(0);
  readonly shortcut = CAPTURE_KEY;
}

export const capture = new CaptureState();

/** Open the capture screen (remounted empty), or go Today if Chapter 1 is not active. */
export function openCapture(opts?: { replace?: boolean }): void {
  if (activation.active.some((m) => m.manifest.id === 'ch01')) {
    capture.openCount += 1;
    void goto('/m/ch01/capture', { replaceState: opts?.replace ?? false });
  } else {
    void goto('/', { replaceState: true });
  }
}
