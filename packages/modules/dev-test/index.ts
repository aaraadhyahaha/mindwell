import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { signals } from './signals';
import { suggestions } from './suggestions';
import NotesCard from './ui/NotesCard.svelte';
import ReviewSection from './ui/ReviewSection.svelte';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [],
  todayCards: [{ id: 'notes', slot: 'evening', component: NotesCard, visible: () => true }],
  prompts,
  signals,
  reviewSections: [{ id: 'notes', title: 'Dev notes', component: ReviewSection, order: 100 }],
  suggestions,
  experiments: [],
};
