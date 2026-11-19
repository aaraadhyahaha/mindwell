import { describe, expect, it } from 'vitest';
import { isCaptureKey } from './capture-key';
import type { CaptureKeyEvent } from './capture-key';

const base: CaptureKeyEvent = {
  key: 'n',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  repeat: false,
  defaultPrevented: false,
};
const ev = (over: Partial<CaptureKeyEvent> = {}): CaptureKeyEvent => ({ ...base, ...over });
const div = { tagName: 'DIV', isContentEditable: false };

describe('isCaptureKey', () => {
  it('accepts bare n and N on the body', () => {
    expect(isCaptureKey(ev({ key: 'n' }), { tagName: 'BODY' })).toBe(true);
    expect(isCaptureKey(ev({ key: 'N' }), { tagName: 'BODY' })).toBe(true);
  });

  it('rejects when ctrl, meta or alt is held', () => {
    expect(isCaptureKey(ev({ ctrlKey: true }), div)).toBe(false);
    expect(isCaptureKey(ev({ metaKey: true }), div)).toBe(false);
    expect(isCaptureKey(ev({ altKey: true }), div)).toBe(false);
  });

  it('rejects auto-repeat', () => {
    expect(isCaptureKey(ev({ repeat: true }), div)).toBe(false);
  });

  it('rejects when the default was already prevented', () => {
    expect(isCaptureKey(ev({ defaultPrevented: true }), div)).toBe(false);
  });

  it('rejects other keys', () => {
    expect(isCaptureKey(ev({ key: 'm' }), div)).toBe(false);
    expect(isCaptureKey(ev({ key: 'Enter' }), div)).toBe(false);
    expect(isCaptureKey(ev({ key: '' }), div)).toBe(false);
  });

  it('rejects when typed into INPUT, TEXTAREA or SELECT', () => {
    expect(isCaptureKey(ev(), { tagName: 'INPUT' })).toBe(false);
    expect(isCaptureKey(ev(), { tagName: 'TEXTAREA' })).toBe(false);
    expect(isCaptureKey(ev(), { tagName: 'SELECT' })).toBe(false);
  });

  it('rejects inside a contentEditable element', () => {
    expect(isCaptureKey(ev(), { tagName: 'DIV', isContentEditable: true })).toBe(false);
  });

  it('accepts when the target is null', () => {
    expect(isCaptureKey(ev(), null)).toBe(true);
  });

  it('accepts on DIV and BUTTON targets', () => {
    expect(isCaptureKey(ev(), div)).toBe(true);
    expect(isCaptureKey(ev(), { tagName: 'BUTTON', isContentEditable: false })).toBe(true);
  });
});
