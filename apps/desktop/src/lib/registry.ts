import type { Component } from 'svelte';
import type { Module } from '@mindwell/core';
import { validateModules } from '@mindwell/core';
import { module as intro } from '@mindwell/module-intro';

/**
 * A module's UI component. Props differ by part (cards and review sections get
 * `ModuleViewProps`), so the registry erases them; the shell passes the right ones.
 */
export type ModuleComponent = Component<any>;

/**
 * THE list of registered modules. Adding a chapter = one line here.
 * Registered is not active: a module is active only when its chapter is marked read.
 */
export const modules: Module<ModuleComponent>[] = [
  intro,
  // Dev-only test module. Imported dynamically inside the DEV branch so a release
  // build drops it entirely (vite.config.js fails the build if it leaks).
  ...(import.meta.env.DEV ? [(await import('@mindwell/module-dev-test')).module] : []),
];

validateModules(modules);
