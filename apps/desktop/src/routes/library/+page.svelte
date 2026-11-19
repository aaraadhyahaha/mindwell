<script lang="ts">
  import { onMount } from 'svelte';
  import type { ModuleManifest } from '@mindwell/core';
  import { Page, SectionLabel, Card, Button, WhySheet } from '@mindwell/ui';
  import { activation } from '$lib/activation.svelte';

  let error = $state<string | null>(null);
  let pending = $state<number | null>(null);
  let whyOpen = $state(false);
  let whyManifest = $state<ModuleManifest | null>(null);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function label(chapter: number): string {
    if (chapter === 0) return 'Introduction';
    if (chapter >= 1 && chapter <= 12) return `Chapter ${chapter}`;
    return 'Development';
  }

  function formatDay(day: string): string {
    const [y, m, d] = day.split('-').map(Number);
    return `${d} ${MONTHS[(m ?? 1) - 1] ?? ''} ${y}`;
  }

  async function run(chapter: number, fn: (c: number) => Promise<void>) {
    pending = chapter;
    error = null;
    try {
      await fn(chapter);
    } catch {
      error = 'Could not save that change. Please try again.';
    } finally {
      pending = null;
    }
  }

  function showWhy(manifest: ModuleManifest) {
    whyManifest = manifest;
    whyOpen = true;
  }

  onMount(async () => {
    if (activation.loaded) return;
    try {
      await activation.load();
    } catch {
      error = 'The library could not be loaded.';
    }
  });
</script>

<Page title="Library">
  <p class="hint">
    Marking a chapter read turns on its module. Marking it unread turns it off; nothing you've recorded is deleted.
  </p>

  {#if error}
    <p class="note">{error}</p>
  {/if}

  {#if activation.loaded}
    <ul>
      {#each activation.library as entry (entry.chapter)}
        <li>
          <Card>
            <SectionLabel>{label(entry.chapter)}</SectionLabel>
            <h2>{entry.title}</h2>
            {#if entry.module}
              <p class="idea">{entry.module.manifest.idea}</p>
              <button type="button" class="why" onclick={() => showWhy(entry.module!.manifest)}>Why this exists</button>
            {:else}
              <p class="note">Companion module coming later.</p>
            {/if}
            <div class="actions">
              {#if entry.readDay}
                <span class="note">Read {formatDay(entry.readDay)}</span>
                <Button variant="quiet" disabled={pending === entry.chapter} onclick={() => run(entry.chapter, (c) => activation.markUnread(c))}>
                  Mark as unread
                </Button>
              {:else}
                <Button variant="secondary" disabled={pending === entry.chapter} onclick={() => run(entry.chapter, (c) => activation.markRead(c))}>
                  Mark as read
                </Button>
              {/if}
            </div>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</Page>

{#if whyManifest}
  <WhySheet bind:open={whyOpen} title={whyManifest.title}>
    <p>{whyManifest.idea}</p>
    <p>{whyManifest.evidence}</p>
    {#if whyManifest.references.length}
      <p class="note">{whyManifest.references.join(' · ')}</p>
    {/if}
  </WhySheet>
{/if}

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  h2 {
    font-family: var(--font-serif);
    font-size: var(--text-19);
    font-weight: 500;
    margin-top: var(--space-1);
  }
  .hint,
  .note {
    font-size: var(--text-14);
    color: var(--muted);
  }
  .hint {
    margin-bottom: var(--space-5);
  }
  .idea {
    font-family: var(--font-serif);
    margin-top: var(--space-2);
  }
  .why {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
    background: transparent;
    border: 0;
    padding: 0;
    margin-top: var(--space-2);
    cursor: pointer;
  }
  .why:hover {
    text-decoration: underline;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }
</style>
