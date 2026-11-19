export interface CaptureKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  repeat: boolean;
  defaultPrevented: boolean;
}

const TEXT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True when this keydown should open capture: a bare N, not typed into a field. */
export function isCaptureKey(
  e: CaptureKeyEvent,
  target: { tagName?: string; isContentEditable?: boolean } | null
): boolean {
  if (e.key !== 'n' && e.key !== 'N') return false;
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return false;
  if (target) {
    if (target.tagName && TEXT_TAGS.has(target.tagName.toUpperCase())) return false;
    if (target.isContentEditable) return false;
  }
  return true;
}
