import type { Component } from 'svelte';
import type { ChapterRecord, LibraryEntry, Module } from '@mindwell/core';
import { activeModules, libraryEntries, markChapterRead, markChapterUnread, readChapters } from '@mindwell/core';
import { getStore } from './db';
import { modules } from './registry';

/**
 * Which chapters are read, and so which modules are active. Everything that
 * gathers prompts, signals, Today cards or nav items must use `active`.
 */
class Activation {
  read = $state<ChapterRecord[]>([]);
  loaded = $state(false);

  active: Module<Component>[] = $derived(activeModules(modules, this.read.map((r) => r.chapter)));
  library: LibraryEntry<Component>[] = $derived(libraryEntries(modules, this.read));

  async load(): Promise<void> {
    this.read = await readChapters(await getStore());
    this.loaded = true;
  }

  async markRead(chapter: number): Promise<void> {
    await markChapterRead(await getStore(), chapter);
    await this.load();
  }

  async markUnread(chapter: number): Promise<void> {
    await markChapterUnread(await getStore(), chapter);
    await this.load();
  }
}

export const activation = new Activation();
