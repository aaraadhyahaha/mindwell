import { describe, expect, it } from 'vitest';
import type { Module, Signals } from '@mindwell/core';
import { BOOK_CHAPTERS } from '@mindwell/core';
import { moduleNavLinks, moduleRunningHead, navCounts, tocRows } from './nav';

function mod(id: string, screens: Module<unknown>['screens']): Module<unknown> {
  return {
    manifest: { id, chapter: 1, title: `Chapter 1: ${id}`, idea: '', evidence: '', references: [] },
    migrations: [], screens, todayCards: [], prompts: [], signals: [], reviewSections: [], suggestions: [], experiments: [],
  };
}

describe('moduleNavLinks', () => {
  it('lists inNav screens with their icon', () => {
    const m = mod('ch01', [
      { path: '', title: 'Thoughts', component: null, inNav: true, icon: 'thoughts' },
      { path: 'capture', title: 'Capture', component: null, inNav: false },
    ]);
    expect(moduleNavLinks([m])).toEqual([{ href: '/m/ch01', label: 'Thoughts', icon: 'thoughts' }]);
  });
});

describe('navCounts', () => {
  it('runs each screen rule against the signals, keyed by href', () => {
    const m = mod('ch01', [
      { path: '', title: 'Thoughts', component: null, inNav: true, navCount: (s: Signals) => Number(s['n']) },
      { path: 'x', title: 'X', component: null, inNav: true },
    ]);
    expect(navCounts([m], { n: 7 })).toEqual({ '/m/ch01': 7 });
  });
  it('treats a throwing or non-numeric rule as no count', () => {
    const m = mod('a', [
      { path: '', title: 'A', component: null, inNav: true, navCount: () => { throw new Error('x'); } },
      { path: 'b', title: 'B', component: null, inNav: true, navCount: () => Number.NaN },
    ]);
    expect(navCounts([m], {})).toEqual({ '/m/a': null, '/m/a/b': null });
  });
});

describe('tocRows', () => {
  const entries = BOOK_CHAPTERS.map((c) => ({ chapter: c.chapter, title: c.title, readDay: null as string | null, module: null as { manifest: { title: string } } | null }));
  const withRead = (read: number[]) =>
    entries.map((e) => ({ ...e, readDay: read.includes(e.chapter) ? '2026-11-01' : null }));

  it('shows the Introduction through chapter 4 when little is read', () => {
    const rows = tocRows(withRead([0, 1]));
    expect(rows.map((r) => r.number)).toEqual(['·', '1', '2', '3', '4']);
    expect(rows.map((r) => r.read)).toEqual([true, true, false, false, false]);
    expect(tocRows(withRead([])).map((r) => r.chapter)).toEqual([0, 1, 2, 3, 4]);
  });
  it('extends three chapters past the furthest read', () => {
    expect(tocRows(withRead([0, 1, 5])).at(-1)?.chapter).toBe(8);
    expect(tocRows(withRead([12])).at(-1)?.chapter).toBe(12);
  });
  it("uses a built chapter's short module title, else the book's short title; keeps Introduction, drops non-book modules", () => {
    const rows = tocRows([
      { chapter: 0, title: 'Introduction', readDay: null, module: { manifest: { title: 'Introduction: Experiments' } } },
      { chapter: 1, title: 'Why negativity sticks', readDay: null, module: { manifest: { title: 'Chapter 1: Notice and name' } } },
      { chapter: 2, title: 'Talking back to your thoughts', readDay: null, module: null },
      { chapter: 100, title: 'Test module', readDay: '2026-11-01', module: { manifest: { title: 'Test module' } } },
    ]);
    expect(rows.map((r) => r.title)).toEqual(['Introduction', 'Notice and name', 'Talking back']);
  });
});

describe('moduleRunningHead', () => {
  it('splits the manifest title into chapter and short title', () => {
    expect(moduleRunningHead({ chapter: 1, title: 'Chapter 1: Notice and name' })).toEqual({ head: 'Chapter 1', sub: 'Notice and name' });
    expect(moduleRunningHead({ chapter: 0, title: 'Introduction: Experiments' })).toEqual({ head: 'Introduction', sub: 'Experiments' });
    expect(moduleRunningHead({ chapter: 100, title: 'Test module' })).toEqual({ head: 'Chapter 100', sub: 'Test module' });
  });
});
