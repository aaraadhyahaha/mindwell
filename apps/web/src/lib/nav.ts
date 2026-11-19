/** Pure helpers for the sidebar (no Store, no Svelte). */
import type { Module, Signals } from '@mindwell/core';
import { BOOK_CHAPTERS } from '@mindwell/core';

export interface NavLink {
  href: string;
  label: string;
  icon?: string;
}

/** Module screens marked `inNav`, in registry order. */
export function moduleNavLinks(active: readonly Module<unknown>[]): NavLink[] {
  return active.flatMap((m) =>
    m.screens
      .filter((s) => s.inNav)
      .map((s) => ({ href: `/m/${m.manifest.id}${s.path ? `/${s.path}` : ''}`, label: s.title, icon: s.icon })),
  );
}

/** Each nav screen's count from its module's pure `navCount`, keyed by href. A throwing rule counts as none. */
export function navCounts(active: readonly Module<unknown>[], signals: Signals): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const m of active) {
    for (const s of m.screens) {
      if (!s.inNav || !s.navCount) continue;
      const href = `/m/${m.manifest.id}${s.path ? `/${s.path}` : ''}`;
      try {
        const n = s.navCount(signals);
        out[href] = typeof n === 'number' && Number.isFinite(n) ? n : null;
      } catch {
        out[href] = null;
      }
    }
  }
  return out;
}

export interface TocRow {
  chapter: number;
  /** "·" for the Introduction, else the chapter number. */
  number: string;
  title: string;
  read: boolean;
}

/** Chapters shown past the furthest one read. */
export const TOC_AHEAD = 3;

/**
 * The sidebar's table of contents: book chapters from the Introduction up to TOC_AHEAD past the
 * furthest chapter read (at least through chapter 1 + TOC_AHEAD). A built chapter shows its
 * module's short title ("Chapter 1: Notice and name" → "Notice and name"), any other chapter its `short`
 * book title ("Talking back"); the Introduction stays "Introduction".
 */
export function tocRows(
  entries: readonly { chapter: number; title: string; readDay: string | null; module: { manifest: { title: string } } | null }[],
): TocRow[] {
  const book = new Set(BOOK_CHAPTERS.map((c) => c.chapter));
  const inBook = entries.filter((e) => book.has(e.chapter));
  const furthest = Math.max(1, ...inBook.filter((e) => e.readDay !== null).map((e) => e.chapter));
  return inBook
    .filter((e) => e.chapter <= furthest + TOC_AHEAD)
    .sort((a, b) => a.chapter - b.chapter)
    .map((e) => ({
      chapter: e.chapter,
      number: e.chapter === 0 ? '·' : String(e.chapter),
      title:
        e.chapter !== 0 && e.module
          ? shortTitle(e.module.manifest.title)
          : (BOOK_CHAPTERS.find((c) => c.chapter === e.chapter)?.short ?? e.title),
      read: e.readDay !== null,
    }));
}

/** Toolbar running head for a module screen: "Chapter 1" + "Notice and name", or "Introduction" + "Experiments". */
export function moduleRunningHead(manifest: { chapter: number; title: string }): { head: string; sub: string } {
  return { head: manifest.chapter === 0 ? 'Introduction' : `Chapter ${manifest.chapter}`, sub: shortTitle(manifest.title) };
}

function shortTitle(manifestTitle: string): string {
  const i = manifestTitle.indexOf(': ');
  return i >= 0 ? manifestTitle.slice(i + 2) : manifestTitle;
}
