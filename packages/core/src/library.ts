import type { Store } from './store';
import type { ChapterRecord } from './records';
import { CORE_TABLES } from './records';
import { localDay } from './dates';

/** Chapters currently marked read, in chapter order. */
export function readChapters(store: Store): Promise<ChapterRecord[]> {
  return store.list<ChapterRecord>(CORE_TABLES.chapters, { orderBy: { column: 'chapter' } });
}

/** Marks a chapter read (activating its module). Idempotent: returns the existing row if already read. */
export async function markChapterRead(store: Store, chapter: number, at: Date = new Date()): Promise<ChapterRecord> {
  if (!Number.isInteger(chapter) || chapter < 0) throw new RangeError(`Bad chapter: ${chapter}`);
  return store.transaction(async (tx) => {
    const [existing] = await tx.list<ChapterRecord>(CORE_TABLES.chapters, { where: { chapter }, limit: 1 });
    if (existing) return existing;
    return tx.insert<ChapterRecord>(CORE_TABLES.chapters, { chapter, read_day: localDay(at) });
  });
}

/** Marks a chapter unread: its module goes inactive. The module's data is kept. */
export async function markChapterUnread(store: Store, chapter: number): Promise<void> {
  await store.transaction(async (tx) => {
    const rows = await tx.list<ChapterRecord>(CORE_TABLES.chapters, { where: { chapter } });
    for (const r of rows) await tx.softDelete(CORE_TABLES.chapters, r.id);
  });
}
