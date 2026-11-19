import { addDays, localDay } from '@mindwell/core';
import type { Store } from '@mindwell/core';
import { validateCaptureText, validateIntensity, validateStoryName } from './schema';
import type { CaptureRecord, StoryRecord } from './schema';
import { suggestStory } from './storyMatch';

const STORIES = 'ch01_stories';
const CAPTURES = 'ch01_captures';
const MATCH_WINDOW_DAYS = 90;

export function listStories(store: Store, opts: { includeArchived?: boolean } = {}): Promise<StoryRecord[]> {
  return store.list<StoryRecord>(STORIES, {
    ...(opts.includeArchived ? {} : { where: { archived: 0 } }),
    orderBy: { column: 'name' },
  });
}

/** Creates a story, or returns the live story with the same name (case-insensitive). */
export async function createStory(store: Store, name: string, day: string): Promise<StoryRecord> {
  const clean = name.trim();
  if (!validateStoryName(clean)) throw new Error('Story name must be 1 to 60 characters.');
  return store.transaction(async (tx) => {
    const all = await listStories(tx, { includeArchived: true });
    const hit = all.find((s) => s.name.toLowerCase() === clean.toLowerCase());
    if (hit) return hit.archived ? tx.update<StoryRecord>(STORIES, hit.id, { archived: 0 }) : hit;
    return tx.insert<StoryRecord>(STORIES, { name: clean, first_seen_day: day, archived: 0 });
  });
}

export function archiveStory(store: Store, id: string): Promise<StoryRecord> {
  return store.update<StoryRecord>(STORIES, id, { archived: 1 });
}

export function renameStory(store: Store, id: string, name: string): Promise<StoryRecord> {
  const clean = name.trim();
  if (!validateStoryName(clean)) throw new Error('Story name must be 1 to 60 characters.');
  return store.update<StoryRecord>(STORIES, id, { name: clean });
}

export function addCapture(
  store: Store,
  input: { text: string; intensity: number | null; at: Date },
): Promise<CaptureRecord> {
  const text = input.text.trim();
  if (!validateCaptureText(text)) throw new Error('A capture must be 1 to 280 characters.');
  if (!validateIntensity(input.intensity)) throw new Error('Intensity must be a whole number from 1 to 5.');
  return store.insert<CaptureRecord>(CAPTURES, {
    text,
    story_id: null,
    intensity: input.intensity,
    captured_at: input.at.toISOString(),
    day: localDay(input.at),
  });
}

export function linkCapture(store: Store, captureId: string, storyId: string | null): Promise<CaptureRecord> {
  return store.update<CaptureRecord>(CAPTURES, captureId, { story_id: storyId });
}

export function capturesOnDay(store: Store, day: string): Promise<CaptureRecord[]> {
  return store.list<CaptureRecord>(CAPTURES, { where: { day }, orderBy: { column: 'captured_at' } });
}

/** Captures with fromDay <= day <= toDay, oldest first. */
export async function capturesBetween(store: Store, fromDay: string, toDay: string): Promise<CaptureRecord[]> {
  const all = await store.list<CaptureRecord>(CAPTURES, { orderBy: { column: 'captured_at' } });
  return all.filter((c) => c.day >= fromDay && c.day <= toDay);
}

export async function storyMatchFor(store: Store, text: string, now: Date = new Date()): Promise<string | null> {
  const today = localDay(now);
  const [stories, captures] = await Promise.all([
    listStories(store),
    capturesBetween(store, addDays(today, -MATCH_WINDOW_DAYS), today),
  ]);
  return suggestStory(text, stories, captures);
}
