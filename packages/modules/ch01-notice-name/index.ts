import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { signals } from './signals';
import { suggestions } from './suggestions';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [],
  todayCards: [],
  prompts,
  signals,
  reviewSections: [],
  suggestions,
  experiments: [{ technique: 'notice_name', label: 'Notice and name daily', defaultDays: 21 }],
};
