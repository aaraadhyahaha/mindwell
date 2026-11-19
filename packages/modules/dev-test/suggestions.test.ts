import { describe, expect, it } from 'vitest';
import { suggestions } from './suggestions';

const rule = suggestions[0]!;

describe('dev.try_a_note', () => {
  it('suggests when there are no notes today', () => {
    expect(rule.evaluate({ 'dev.notes_today': 0 }, { day: '2026-11-19' })?.key).toBe('dev.try_a_note');
  });
  it('stays quiet when there are notes or the signal is missing', () => {
    expect(rule.evaluate({ 'dev.notes_today': 2 }, { day: '2026-11-19' })).toBeNull();
    expect(rule.evaluate({}, { day: '2026-11-19' })).toBeNull();
  });
});
