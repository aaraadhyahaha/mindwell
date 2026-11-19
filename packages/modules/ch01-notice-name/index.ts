import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { eveningCardVisible, signals, storiesNoteVisible, thoughtsNavCount } from './signals';
import { suggestions } from './suggestions';
import CaptureScreen from './ui/CaptureScreen.svelte';
import EveningCard from './ui/EveningCard.svelte';
import ReviewSection from './ui/ReviewSection.svelte';
import StoriesNote from './ui/StoriesNote.svelte';
import ThoughtsScreen from './ui/ThoughtsScreen.svelte';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [
    { path: '', title: 'Thoughts', component: ThoughtsScreen, inNav: true, icon: 'thoughts', navCount: thoughtsNavCount },
    { path: 'capture', title: 'Capture', component: CaptureScreen, inNav: false },
  ],
  todayCards: [
    { id: 'stories', slot: 'margin', component: StoriesNote, visible: storiesNoteVisible, order: 20 },
    { id: 'evening', slot: 'evening', component: EveningCard, visible: eveningCardVisible },
  ],
  prompts,
  signals,
  reviewSections: [{ id: 'stories', title: 'Your stories this week', component: ReviewSection, order: 20 }],
  suggestions,
  experiments: [{ technique: 'notice_name', label: 'Notice and name daily', defaultDays: 21 }],
};
