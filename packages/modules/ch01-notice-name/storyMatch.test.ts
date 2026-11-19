import { describe, expect, it } from 'vitest';
import type { CaptureRecord, StoryRecord } from './schema';
import { suggestStory, words } from './storyMatch';

const story = (id: string, name: string, archived = 0) => ({ id, name, archived }) as StoryRecord;
const cap = (story_id: string, text: string, captured_at: string) =>
  ({ id: captured_at, story_id, text, captured_at }) as CaptureRecord;

describe('words', () => {
  it('lowercases, drops short words and stopwords', () => {
    expect([...words('The Deadline is NOT ok, deadline!')]).toEqual(['deadline']);
  });
});

describe('suggestStory', () => {
  const stories = [story('a', 'not good enough'), story('b', 'money worries')];
  it('links on a shared word', () => {
    expect(suggestStory('I am not good at this', stories, [])).toBe('a');
  });
  it('uses past capture texts', () => {
    expect(suggestStory('rent again', stories, [cap('b', 'rent is due', '2026-11-01T10:00:00Z')])).toBe('b');
  });
  it('ignores stopwords', () => {
    expect(suggestStory('the and that', stories, [])).toBeNull();
  });
  it('skips archived stories', () => {
    expect(suggestStory('money', [story('b', 'money worries', 1)], [])).toBeNull();
  });
  it('breaks ties by most recent capture', () => {
    const s = [story('a', 'work'), story('b', 'work')];
    const c = [cap('a', 'x', '2026-11-01T10:00:00Z'), cap('b', 'y', '2026-11-02T10:00:00Z')];
    expect(suggestStory('work', s, c)).toBe('b');
  });
  it('returns null with no overlap', () => {
    expect(suggestStory('sunshine', stories, [])).toBeNull();
  });
});

describe('suggestStory edge cases', () => {
  const stories = [story('a', 'not good enough'), story('b', 'money worries')];
  it('returns null for empty text', () => {
    expect(suggestStory('', stories, [])).toBeNull();
  });
  it('ignores case and punctuation', () => {
    expect(suggestStory('MONEY!!! worries...', stories, [])).toBe('b');
    expect(suggestStory('money-worries', stories, [])).toBe('b');
  });
  it('ignores words under 3 letters', () => {
    const s = [story('a', 'go it ok')];
    expect(suggestStory('go it ok', s, [])).toBeNull();
    expect(words('ok go it')).toEqual(new Set());
  });
  it('matches a story name with no past captures', () => {
    expect(suggestStory('worries', [story('b', 'money worries')], [])).toBe('b');
  });
});
