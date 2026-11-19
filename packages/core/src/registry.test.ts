import { describe, expect, it } from 'vitest';
import type { Module, PromptDef } from './index';
import { BOOK_CHAPTERS, activeModules, libraryEntries, recentlyUnlocked, validateModules } from './index';

function mod(id: string, chapter: number, extra: Partial<Module> = {}): Module {
  return {
    manifest: { id, chapter, title: id, idea: '', evidence: '', references: [] },
    migrations: [], screens: [], todayCards: [], prompts: [], signals: [],
    reviewSections: [], suggestions: [], experiments: [], ...extra,
  };
}
const prompt = (id: string, module: string): PromptDef => ({
  id, module, kind: 'journal', when: 'morning', technique: 't', text: 'x', weight: 1, cooldownDays: 0, condition: () => true,
});

describe('validateModules', () => {
  it('accepts a valid registry', () => {
    expect(() => validateModules([mod('ch01', 1, { prompts: [prompt('ch01.a', 'ch01')] }), mod('ch02', 2)])).not.toThrow();
  });
  it.each([
    ['duplicate id', [mod('ch01', 1), mod('ch01', 2)]],
    ['duplicate chapter', [mod('ch01', 1), mod('ch02', 1)]],
    ['reserved id', [mod('core', 1)]],
    ['bad id', [mod('Ch01', 1)]],
    ['prompt module mismatch', [mod('ch01', 1, { prompts: [prompt('ch01.a', 'ch02')] })]],
    ['prompt id prefix', [mod('ch01', 1, { prompts: [prompt('ch02.a', 'ch01')] })]],
    ['signal prefix', [mod('ch01', 1, { signals: [{ key: 'x.y', compute: async () => 1 }] })]],
    ['migration version', [mod('ch01', 1, { migrations: [{ version: 1, sql: '' }, { version: 1, sql: '' }] })]],
  ])('rejects %s', (_, modules) => {
    expect(() => validateModules(modules)).toThrow();
  });
});

describe('activeModules', () => {
  it('keeps only modules whose chapter is read, in registry order', () => {
    const ms = [mod('ch02', 2), mod('ch01', 1), mod('ch03', 3)];
    expect(activeModules(ms, [1, 2, 7]).map((m) => m.manifest.id)).toEqual(['ch02', 'ch01']);
    expect(activeModules(ms, [])).toEqual([]);
  });
});

describe('recentlyUnlocked', () => {
  const ms = [mod('ch01', 1), mod('ch02', 2), mod('ch03', 3)];
  it('includes modules read 0–14 days ago only', () => {
    const read = [
      { chapter: 1, read_day: '2026-11-05' }, // 14 days
      { chapter: 2, read_day: '2026-11-04' }, // 15 days
      { chapter: 3, read_day: '2026-11-19' }, // today
    ];
    expect(recentlyUnlocked(ms, read, '2026-11-19')).toEqual(['ch01', 'ch03']);
  });
});

describe('libraryEntries', () => {
  it('lists every book chapter plus off-book modules, marking active ones', () => {
    const entries = libraryEntries([mod('dev', 100), mod('ch01', 1)], [
      { chapter: 1, read_day: '2026-11-19' },
      { chapter: 5, read_day: '2026-11-19' },
    ]);
    expect(entries).toHaveLength(BOOK_CHAPTERS.length + 1);
    expect(entries.map((e) => e.chapter)).toEqual([...BOOK_CHAPTERS.map((c) => c.chapter), 100]);
    expect(entries.find((e) => e.chapter === 1)).toMatchObject({ active: true, readDay: '2026-11-19' });
    expect(entries.find((e) => e.chapter === 5)).toMatchObject({ active: false, module: null, readDay: '2026-11-19' });
    expect(entries.at(-1)).toMatchObject({ chapter: 100, title: 'dev', active: false });
  });
});
