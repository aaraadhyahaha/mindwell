export type * from './store';
export type * from './prompts';
export type * from './module';
export type {
  DayType,
  IntentResult,
  DayRecord,
  PromptSlot,
  PromptFeedback,
  PromptShownRecord,
  PromptScoreRecord,
  ChapterRecord,
  SuggestionStatus,
  SuggestionRecord,
  SettingRecord,
} from './records';
export type { BookChapter } from './book';
export type { LibraryEntry } from './registry';
export { DAY_BOUNDARY_HOUR, localDay, isDay, addDays, daysBetween } from './dates';
export { newId, isId } from './id';
export { CORE_TABLES, DAY_TYPES } from './records';
export { coreMigrations } from './migrations';
export { BOOK_CHAPTERS } from './book';
export {
  RECENTLY_UNLOCKED_DAYS,
  validateModules,
  activeModules,
  recentlyUnlocked,
  libraryEntries,
} from './registry';
export { readChapters, markChapterRead, markChapterUnread } from './library';
export type { CoreSignalInput, BuildSignalsOptions, SignalsSnapshot } from './signals';
export {
  CORE_SIGNALS,
  NAME_SETTING,
  signalNumber,
  signalString,
  signalList,
  signalIncludes,
  signalObject,
  coreSignals,
  parseDayTypes,
  buildSignals,
} from './signals';
export { corePrompts, FALLBACK_INTENT_ID, FALLBACK_JOURNAL_ID } from './core-prompts';
export type { PromptStats, SlotRules, SelectionInput, PickedPrompt, Selection } from './engine';
export {
  SLOT_RULES,
  NOVELTY_BONUS,
  JITTER_MIN,
  JITTER_MAX,
  promptLibrary,
  usefulness,
  jitter,
  daysSinceShown,
  renderPrompt,
  scorePrompt,
  candidates,
  selectPrompts,
  showAnother,
} from './engine';
export type { PromptHistory } from './prompt-log';
export { loadPromptHistory, shownInSlot, recordShown, recordSwap, setFeedback } from './prompt-log';
