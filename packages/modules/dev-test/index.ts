import type { Module } from '@mindwell/core';
import { manifest } from './manifest';
import { migrations } from './migrations';
import { prompts } from './prompts';
import { signals } from './signals';

export const module: Module<never> = {
  manifest,
  migrations,
  screens: [],
  todayCards: [],
  prompts,
  signals,
  reviewSections: [],
  suggestions: [],
  experiments: [],
};
