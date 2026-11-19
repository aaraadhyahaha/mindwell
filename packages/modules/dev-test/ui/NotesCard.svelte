<script lang="ts">
  import type { BaseRecord, ModuleViewProps } from '@mindwell/core';

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

<div class="card">
  <p class="label">Dev notes today</p>
  {#if notes.length === 0}
    <p class="muted">Notes you add here today will gather in this card.</p>
  {:else}
    <ul>
      {#each notes as n (n.id)}<li>{n.body}</li>{/each}
    </ul>
  {/if}
  <form onsubmit={add}>
    <label>
      <span class="label">Add a note</span>
      <input bind:value={draft} />
    </label>
  </form>
  {#if error}<p class="muted" role="alert">{error}</p>{/if}
</div>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 6px;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .label {
    font-family: var(--font-sans);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
  }
  .muted {
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--muted);
  }
  ul {
    margin: 0;
    padding-left: 1.2em;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  input {
    font: inherit;
    color: var(--ink);
    background: var(--bg);
    border: 1px solid var(--rule);
    border-radius: 6px;
    padding: var(--space-2) var(--space-3);
  }
  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
