/** Chapters of *Clear Mind, Steady Work*, as listed in the Library. */
export interface BookChapter {
  /** Introduction = 0. */
  chapter: number;
  title: string;
}

// Titles for 4–12 are working titles from the roadmap until those chapters' specs are written.
export const BOOK_CHAPTERS: readonly BookChapter[] = [
  { chapter: 0, title: 'Introduction' },
  { chapter: 1, title: 'Why negativity sticks' },
  { chapter: 2, title: 'Talking back to your thoughts' },
  { chapter: 3, title: 'Making room for hard feelings' },
  { chapter: 4, title: 'Setting goals' },
  { chapter: 5, title: 'Wishes and obstacles' },
  { chapter: 6, title: 'If-then plans' },
  { chapter: 7, title: 'Building habits' },
  { chapter: 8, title: 'Practising well' },
  { chapter: 9, title: 'Tracking progress' },
  { chapter: 10, title: 'Sleep and movement' },
  { chapter: 11, title: 'Slips and fresh starts' },
  { chapter: 12, title: 'Confidence from evidence' },
];
