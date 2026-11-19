import { describe, expect, it } from 'vitest';
import { renderPrompt } from '@mindwell/core';
import type { Signals } from '@mindwell/core';
import { prompts } from './prompts';

const verdict = prompts.find((p) => p.id === 'intro.verdict_reflect')!;
const mid = prompts.find((p) => p.id === 'intro.mid_check')!;

const due = (label: string, id = 'x') => ({ id, technique: 't', label });

describe('intro.verdict_reflect', () => {
  it('has the expected metadata', () => {
    expect(verdict.module).toBe('intro');
    expect(verdict.when).toBe('evening');
    expect(verdict.cooldownDays).toBe(2);
  });

  it('fires when something awaits a verdict with a label', () => {
    const s: Signals = { 'intro.awaiting_verdict': 1, 'intro.verdict_due': [due('Walks')] };
    expect(verdict.condition(s)).toBe(true);
  });

  it('does not fire with a missing signal', () => {
    expect(verdict.condition({})).toBe(false);
  });

  it('does not fire when awaiting_verdict is null', () => {
    expect(verdict.condition({ 'intro.awaiting_verdict': null, 'intro.verdict_due': [due('Walks')] })).toBe(false);
  });

  it('does not fire when awaiting_verdict is 0', () => {
    expect(verdict.condition({ 'intro.awaiting_verdict': 0, 'intro.verdict_due': [] })).toBe(false);
  });

  it('does not fire when verdict_due is empty despite a count', () => {
    expect(verdict.condition({ 'intro.awaiting_verdict': 1, 'intro.verdict_due': [] })).toBe(false);
  });

  it('does not fire when the first due entry has no label', () => {
    expect(verdict.condition({ 'intro.awaiting_verdict': 1, 'intro.verdict_due': [{ id: 'x' }] })).toBe(false);
  });

  it('fills the technique from verdict_due[0]', () => {
    const s: Signals = { 'intro.awaiting_verdict': 2, 'intro.verdict_due': [due('Walks', 'a'), due('Journal', 'b')] };
    expect(renderPrompt(verdict, s)).toBe("What did Walks change for you, and what didn't it?");
  });

  it('renders null when the fill has no label', () => {
    const s: Signals = { 'intro.awaiting_verdict': 1, 'intro.verdict_due': [{ id: 'x' }] };
    expect(renderPrompt(verdict, s)).toBeNull();
  });
});

describe('intro.mid_check', () => {
  it('has the expected metadata', () => {
    expect(mid.module).toBe('intro');
    expect(mid.when).toBe('morning');
    expect(mid.cooldownDays).toBe(7);
  });

  it('fires when midpoint_today is a label', () => {
    expect(mid.condition({ 'intro.midpoint_today': 'Walks' })).toBe(true);
  });

  it('does not fire when midpoint_today is null', () => {
    expect(mid.condition({ 'intro.midpoint_today': null })).toBe(false);
  });

  it('does not fire when midpoint_today is missing', () => {
    expect(mid.condition({})).toBe(false);
  });

  it('does not fire when midpoint_today is an empty string', () => {
    expect(mid.condition({ 'intro.midpoint_today': '' })).toBe(false);
  });

  it('fills the technique from midpoint_today', () => {
    expect(renderPrompt(mid, { 'intro.midpoint_today': 'Walks' })).toBe(
      'Halfway through trying Walks: what are you noticing so far?',
    );
  });

  it('renders null when midpoint_today is missing', () => {
    expect(renderPrompt(mid, {})).toBeNull();
  });
});
