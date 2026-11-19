import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { signals } from './signals';
import { suggestions } from './suggestions';
import RecordForm from './ui/RecordForm.svelte';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [{ path: 'new', title: 'New thought record', component: RecordForm, inNav: false }],
  todayCards: [],
  prompts,
  signals,
  reviewSections: [],
  suggestions,
  experiments: [
    { technique: 'thought_records', label: 'A thought record whenever a thought hits 60 or more', defaultDays: 21 },
    { technique: 'coach_by_name', label: 'Coach yourself by name when stressed', defaultDays: 14 },
  ],
};
