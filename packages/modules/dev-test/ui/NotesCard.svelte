<script lang="ts">
  import type { BaseRecord, ModuleViewProps } from '@mindwell/core';
  import { Card, Field, SectionLabel } from '@mindwell/ui';

  interface Note extends BaseRecord {
    day: string;
    body: string;
  }

  let { store, day }: ModuleViewProps = $props();
  let notes = $state<Note[]>([]);
  let draft = $state('');
  let error = $state<string | null>(null);

  async function load() {
    notes = await store.list<Note>('dev_notes', { where: { day }, orderBy: { column: 'id' } });
  }

  async function add(e: SubmitEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    try {
      await store.insert<Note>('dev_notes', { day, body });
      draft = '';
      error = null;
      await load();
    } catch {
      error = 'Could not save that. Please try again.';
    }
  }

  $effect(() => {
    void day;
    void load();
  });
</script>

<Card>
  <SectionLabel>Dev notes today</SectionLabel>
  {#if notes.length === 0}
    <p class="muted">Notes you add here today will gather in this card.</p>
  {:else}
    <ul>
      {#each notes as n (n.id)}<li>{n.body}</li>{/each}
    </ul>
  {/if}
  <form onsubmit={add}>
    <Field label="Add a note" bind:value={draft} hint="Press Enter to save." />
  </form>
  {#if error}<p class="muted" role="alert">{error}</p>{/if}
</Card>

<style>
  .muted {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  ul {
    margin: var(--space-2) 0;
    padding-left: 1.2em;
  }
</style>
