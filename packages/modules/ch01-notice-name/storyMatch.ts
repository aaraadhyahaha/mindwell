import type { CaptureRecord, StoryRecord } from './schema';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'were', 'but', 'not', 'you', 'have',
  'has', 'had', 'its', 'can', 'will', 'just', 'about', 'from', 'they', 'them', 'there',
  'then', 'than', 'what', 'when', 'who', 'how', 'why', 'all', 'any', 'been', 'being', 'would',
  'could', 'should', 'thought', 'again',
]);

/** Lowercased words of >= 3 letters, split on non-letters, minus stopwords. */
export function words(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().split(/[^\p{L}]+/u)) {
    if (w.length >= 3 && !STOPWORDS.has(w)) out.add(w);
  }
  return out;
}

/**
 * Id of the live story sharing the most distinct words with `text` (story name plus its
 * captures' texts), or null. Ties go to the story with the most recent capture.
 */
export function suggestStory(text: string, stories: StoryRecord[], captures: CaptureRecord[]): string | null {
  const mine = words(text);
  if (mine.size === 0) return null;
  let best: string | null = null;
  let bestScore = 0;
  let bestRecent = '';
  for (const story of stories) {
    if (story.archived) continue;
    const own = captures.filter((c) => c.story_id === story.id);
    const theirs = words(story.name);
    for (const c of own) for (const w of words(c.text)) theirs.add(w);
    let score = 0;
    for (const w of mine) if (theirs.has(w)) score++;
    if (score < 1) continue;
    const recent = own.reduce((m, c) => (c.captured_at > m ? c.captured_at : m), '');
    if (score > bestScore || (score === bestScore && recent > bestRecent)) {
      best = story.id;
      bestScore = score;
      bestRecent = recent;
    }
  }
  return best;
}
