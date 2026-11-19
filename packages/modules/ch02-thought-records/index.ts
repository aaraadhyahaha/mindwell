import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { recordsNavCount, signals, startCardVisible } from './signals';
import { suggestions } from './suggestions';
import ReviewSection from './ui/ReviewSection.svelte';
import StartCard from './ui/StartCard.svelte';
import HistoryScreen from './ui/HistoryScreen.svelte';
import RecordForm from './ui/RecordForm.svelte';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [
    { path: '', title: 'Thought records', component: HistoryScreen, inNav: true, icon: 'records', navCount: recordsNavCount, whyInOpener: true },
    { path: 'new', title: 'New thought record', component: RecordForm, inNav: false },
  ],
  todayCards: [{ id: 'start', slot: 'anytime', component: StartCard, visible: startCardVisible }],
  prompts,
  signals,
  reviewSections: [{ id: 'records', title: 'Thought records', component: ReviewSection, order: 30 }],
  suggestions,
  experiments: [
    { technique: 'thought_records', label: 'A thought record whenever a thought hits 60 or more', defaultDays: 21 },
    { technique: 'coach_by_name', label: 'Coach yourself by name when stressed', defaultDays: 14 },
  ],
};
