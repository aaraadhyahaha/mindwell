import type { Module } from './module';
import type { ChapterRecord } from './records';
import { BOOK_CHAPTERS } from './book';
import { daysBetween } from './dates';

const MODULE_ID_RE = /^[a-z][a-z0-9]*$/;
const RESERVED_IDS = new Set(['core', 'day', 'yesterday', 'user', 'chapters', 'prompt']);

/** How long a newly read chapter's module counts as recently unlocked (prompt novelty bonus). */
export const RECENTLY_UNLOCKED_DAYS = 14;

/**
 * Throws if the registry breaks the module contract: ids unique, lowercase and
 * not reserved; one module per chapter; prompts and signals namespaced by the
 * module id; migration versions unique and positive.
 */
export function validateModules(modules: readonly Module<unknown>[]): void {
  const ids = new Set<string>();
  const chapters = new Set<number>();
  for (const m of modules) {
    const { id, chapter } = m.manifest;
    if (!MODULE_ID_RE.test(id) || RESERVED_IDS.has(id)) throw new Error(`Module id not allowed: ${JSON.stringify(id)}`);
    if (ids.has(id)) throw new Error(`Duplicate module id: ${id}`);
    if (!Number.isInteger(chapter) || chapter < 0) throw new Error(`Module ${id}: chapter must be an integer ≥ 0`);
    if (chapters.has(chapter)) throw new Error(`Module ${id}: chapter ${chapter} already has a module`);
    ids.add(id);
    chapters.add(chapter);

    for (const p of m.prompts) {
      if (p.module !== id) throw new Error(`Prompt ${p.id}: module is ${JSON.stringify(p.module)}, expected ${id}`);
      if (!p.id.startsWith(`${id}.`)) throw new Error(`Prompt ${p.id}: id must start with "${id}."`);
    }
    for (const s of m.signals) {
      if (!s.key.startsWith(`${id}.`)) throw new Error(`Signal ${s.key}: key must start with "${id}."`);
    }
    const versions = new Set<number>();
    for (const mig of m.migrations) {
      if (!Number.isInteger(mig.version) || mig.version < 1 || versions.has(mig.version)) {
        throw new Error(`Module ${id}: bad or duplicate migration version ${mig.version}`);
      }
      versions.add(mig.version);
    }
  }
}

/** Modules whose chapter is marked read. Everything else contributes nothing. Keeps registry order. */
export function activeModules<C>(modules: readonly Module<C>[], readChapters: Iterable<number>): Module<C>[] {
  const read = new Set(readChapters);
  return modules.filter((m) => read.has(m.manifest.chapter));
}

/** Ids of active modules whose chapter was marked read at most `RECENTLY_UNLOCKED_DAYS` before `day`. */
export function recentlyUnlocked(
  modules: readonly Module<unknown>[],
  read: readonly Pick<ChapterRecord, 'chapter' | 'read_day'>[],
  day: string,
): string[] {
  const byChapter = new Map(read.map((r) => [r.chapter, r.read_day]));
  return modules
    .filter((m) => {
      const readDay = byChapter.get(m.manifest.chapter);
      if (readDay === undefined) return false;
      const age = daysBetween(readDay, day);
      return age >= 0 && age <= RECENTLY_UNLOCKED_DAYS;
    })
    .map((m) => m.manifest.id);
}

export interface LibraryEntry<C> {
  chapter: number;
  title: string;
  /** The chapter's module, or null if not built yet. */
  module: Module<C> | null;
  /** Local day it was marked read, or null. */
  readDay: string | null;
  /** Read and has a module. */
  active: boolean;
}

/**
 * One entry per book chapter, plus any registered module whose chapter is not
 * in the book (e.g. the dev test module), in chapter order.
 */
export function libraryEntries<C>(
  modules: readonly Module<C>[],
  read: readonly Pick<ChapterRecord, 'chapter' | 'read_day'>[],
): LibraryEntry<C>[] {
  const byChapter = new Map(modules.map((m) => [m.manifest.chapter, m]));
  const readDays = new Map(read.map((r) => [r.chapter, r.read_day]));
  const rows = BOOK_CHAPTERS.map((c) => ({ chapter: c.chapter, title: c.title }));
  for (const m of modules) {
    if (!BOOK_CHAPTERS.some((c) => c.chapter === m.manifest.chapter)) {
      rows.push({ chapter: m.manifest.chapter, title: m.manifest.title });
    }
  }
  return rows
    .sort((a, b) => a.chapter - b.chapter)
    .map(({ chapter, title }) => {
      const module = byChapter.get(chapter) ?? null;
      const readDay = readDays.get(chapter) ?? null;
      return { chapter, title, module, readDay, active: module !== null && readDay !== null };
    });
}
