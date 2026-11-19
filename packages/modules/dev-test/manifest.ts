import type { ModuleManifest } from '@mindwell/core';

/** Dev-only module that exercises the module contract. Registered only in dev builds. */
export const manifest: ModuleManifest = {
  id: 'dev',
  chapter: 100,
  title: 'Test module (development only)',
  idea: 'Exercises the module contract so the daily loop can be checked before any chapter exists.',
  evidence: 'Not a book chapter. It publishes one signal and two prompts and is never registered in release builds.',
  references: [],
};
