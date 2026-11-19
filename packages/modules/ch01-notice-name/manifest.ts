import type { ModuleManifest } from '@mindwell/core';

export const manifest: ModuleManifest = {
  id: 'ch01',
  chapter: 1,
  title: 'Chapter 1: Notice and name',
  idea: "You can't erase negative thoughts, and fighting them backfires. Notice them, name them, and carry on.",
  evidence:
    'The brain weights bad over good (Baumeister et al., 2001). Suppressing a thought makes it return more (Wegner et al., 1987). Putting a feeling into words reduces amygdala activity (Lieberman et al., 2007).',
  references: ['Baumeister et al. 2001', 'Wegner et al. 1987', 'Lieberman et al. 2007'],
  adds: ['A capture window, one shortcut away', 'Stories for the thoughts that repeat', 'Weekly counts for each story'],
};
