export const DEFAULT_CAPTURE_SHORTCUT = 'Super+Shift+N';

class CaptureState {
  /** Bumped each time capture is asked to open; the module route keys on it. */
  openCount = $state(0);
  shortcut = $state(DEFAULT_CAPTURE_SHORTCUT);
}

export const capture = new CaptureState();
