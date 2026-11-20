import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { reminders } from './reminders';
import { reappraisalCardVisible, signals } from './signals';
import { suggestions } from './suggestions';
import Ch03Screen from './ui/Ch03Screen.svelte';
import ReappraisalCard from './ui/ReappraisalCard.svelte';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [{ path: '', title: 'Making room', component: Ch03Screen, inNav: true, icon: 'room', whyInOpener: true }],
  todayCards: [{ id: 'ch03.reappraisal', slot: 'morning', component: ReappraisalCard, visible: reappraisalCardVisible }],
  prompts,
  signals,
  reviewSections: [],
  suggestions,
  experiments: [
    { technique: 'defusion', label: 'Defuse repeating thoughts', defaultDays: 14 },
    { technique: 'reappraisal', label: '"I\'m excited" before stressful events', defaultDays: 21 },
    { technique: 'gratitude', label: 'Gratitude twice a week', defaultDays: 28 },
  ],
  reminders,
};
