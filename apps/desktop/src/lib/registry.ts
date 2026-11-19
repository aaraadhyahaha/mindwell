import type { Component } from 'svelte';
import type { Module } from '@mindwell/core';
import { validateModules } from '@mindwell/core';
import { module as devTest } from '@mindwell/module-dev-test';

/**
 * THE list of registered modules. Adding a chapter = one line here.
 * Registered is not active: a module is active only when its chapter is marked read.
 */
export const modules: Module<Component>[] = [
  // Dev-only test module; never in release builds.
  ...(import.meta.env.DEV ? [devTest] : []),
];

validateModules(modules);
