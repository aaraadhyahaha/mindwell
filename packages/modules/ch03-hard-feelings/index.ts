import type { Component } from 'svelte';
import type { Module, ModuleViewProps } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';

export const module: Module<Component<ModuleViewProps>> = {
  manifest,
  migrations,
  screens: [],
  todayCards: [],
  prompts: [],
  signals: [],
  reviewSections: [],
  suggestions: [],
  experiments: [],
};
