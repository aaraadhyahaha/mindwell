import type { Component } from 'svelte';
import type { Module } from '@mindwell/core';
import { validateModules } from '@mindwell/core';
import { module as devTest } from '@mindwell/module-dev-test';

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
  // Dev-only test module; never in release builds.
  ...(import.meta.env.DEV ? [devTest] : []),
];

validateModules(modules);
