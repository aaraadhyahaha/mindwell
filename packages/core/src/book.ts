/** Chapters of *Clear Mind, Steady Work*, as listed in the Library. */
export interface BookChapter {
  /** Introduction = 0. */
  chapter: number;
  title: string;
  /** The sidebar contents line, when the full title is too long for it. */
  short?: string;
}

export const BOOK_CHAPTERS: readonly BookChapter[] = [
  { chapter: 0, title: 'Introduction' },
  { chapter: 1, title: 'Why negativity sticks' },
  { chapter: 2, title: 'Talking back to your thoughts', short: 'Talking back' },
  { chapter: 3, title: 'Making room for hard feelings', short: 'Making room' },
  { chapter: 4, title: 'Choosing goals worth chasing', short: 'Goals worth chasing' },
  { chapter: 5, title: 'Visualization that actually works', short: 'Visualization' },
  { chapter: 6, title: 'If-then plans' },
  { chapter: 7, title: 'Habits and environment', short: 'Habits' },
  { chapter: 8, title: 'Deliberate practice' },
  { chapter: 9, title: 'Tracking, review and accountability', short: 'Tracking and review' },
  { chapter: 10, title: 'The body: sleep and exercise', short: 'Sleep and exercise' },
  { chapter: 11, title: 'Setbacks and self-compassion', short: 'Setbacks' },
  { chapter: 12, title: 'Confidence you can trust', short: 'Confidence' },
];

/** The book's parts, as the Library groups chapters. A part starts at `first` and runs to the next part. */
export interface BookPart {
  first: number;
  /** "Part one". */
  name: string;
  title: string;
}

export const BOOK_PARTS: readonly BookPart[] = [
  { first: 1, name: 'Part one', title: 'Working with your mind' },
  { first: 4, name: 'Part two', title: 'Setting your direction' },
  { first: 7, name: 'Part three', title: 'The daily engine' },
  { first: 11, name: 'Part four', title: 'When things go wrong' },
];
