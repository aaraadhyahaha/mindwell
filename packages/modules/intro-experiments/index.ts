import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { experimentNoteVisible, experimentsNavCount, signals, verdictCardVisible } from './signals';
import { suggestions } from './suggestions';
import ExperimentsScreen from './ui/ExperimentsScreen.svelte';
import ReviewSection from './ui/ReviewSection.svelte';
import VerdictCard from './ui/VerdictCard.svelte';
import ExperimentNote from './ui/ExperimentNote.svelte';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [
    { path: '', title: 'Experiments', component: ExperimentsScreen, inNav: true, icon: 'experiments', navCount: experimentsNavCount },
  ],
  todayCards: [
    {
      id: 'verdict',
      slot: 'morning',
      component: VerdictCard,
      visible: verdictCardVisible,
    },
    { id: 'experiment', slot: 'margin', component: ExperimentNote, visible: experimentNoteVisible, order: 40 },
  ],
  prompts,
  signals,
  reviewSections: [{ id: 'experiments', title: 'Experiments', component: ReviewSection, order: 10 }],
  suggestions,
  experiments: [],
};
