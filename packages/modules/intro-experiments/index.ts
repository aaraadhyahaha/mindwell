import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { signalNumber } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { signals } from './signals';
import { suggestions } from './suggestions';
import ExperimentsScreen from './ui/ExperimentsScreen.svelte';
import ReviewSection from './ui/ReviewSection.svelte';
import VerdictCard from './ui/VerdictCard.svelte';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [{ path: '', title: 'Experiments', component: ExperimentsScreen, inNav: true }],
  todayCards: [
    {
      id: 'verdict',
      slot: 'morning',
      component: VerdictCard,
      visible: (s) => (signalNumber(s, 'intro.awaiting_verdict') ?? 0) > 0,
    },
  ],
  prompts,
  signals,
  reviewSections: [{ id: 'experiments', title: 'Experiments', component: ReviewSection, order: 10 }],
  suggestions,
  experiments: [],
};
