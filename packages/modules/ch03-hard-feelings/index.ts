import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { reminders } from './reminders';
import { rateCardVisible, reappraisalCardVisible, sessionCardVisible, signals } from './signals';
import { suggestions } from './suggestions';
import Ch03Screen from './ui/Ch03Screen.svelte';
import RateEventCard from './ui/RateEventCard.svelte';
import ReappraisalCard from './ui/ReappraisalCard.svelte';
import ReviewSection from './ui/ReviewSection.svelte';
import SessionCard from './ui/SessionCard.svelte';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [{ path: '', title: 'Making room', component: Ch03Screen, inNav: true, icon: 'room', whyInOpener: true }],
  todayCards: [
    { id: 'ch03.reappraisal', slot: 'morning', component: ReappraisalCard, visible: reappraisalCardVisible },
    { id: 'ch03.rate', slot: 'evening', component: RateEventCard, visible: rateCardVisible },
    { id: 'ch03.session', slot: 'anytime', component: SessionCard, visible: sessionCardVisible },
  ],
  prompts,
  signals,
  reviewSections: [{ id: 'ch03.review', title: 'Making room', component: ReviewSection, order: 30 }],
  suggestions,
  experiments: [
    { technique: 'defusion', label: 'Defuse repeating thoughts', defaultDays: 14 },
    { technique: 'reappraisal', label: '"I\'m excited" before stressful events', defaultDays: 21 },
    { technique: 'gratitude', label: 'Gratitude twice a week', defaultDays: 28 },
  ],
  reminders,
};
