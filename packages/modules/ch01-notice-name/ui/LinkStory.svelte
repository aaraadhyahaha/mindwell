<script lang="ts">
  import type { Store } from '@mindwell/core';
  import { Button } from '@mindwell/ui';
  import { createStory, linkCapture } from '../repo';
  import type { StoryRecord } from '../schema';

  let {
    store,
    day,
    captureId,
    stories,
    onlinked,
  }: { store: Store; day: string; captureId: string; stories: StoryRecord[]; onlinked: () => void } = $props();

  let open = $state(false);
  let picked = $state('');
  let name = $state('');
  let error = $state<string | null>(null);

  async function link(storyId: string) {
    try {
      await linkCapture(store, captureId, storyId);
      error = null;
      open = false;
      onlinked();
    } catch {
      error = 'Could not link that. Please try again.';
    }
  }

  async function create(ev: SubmitEvent) {
    ev.preventDefault();
    try {
      const story = await createStory(store, name, day);
      await link(story.id);
      name = '';
    } catch {
      error = 'Could not create that story. Use 1 to 60 characters.';
    }
  }
</script>

{#if !open}
  <button type="button" class="open" onclick={() => (open = true)}>Link to a story</button>
{:else}
  <span class="link">
    {#if stories.length > 0}
      <select
        aria-label="Existing story"
        bind:value={picked}
        onchange={() => picked && void link(picked)}
      >
        <option value="">Choose a story</option>
        {#each stories as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
      </select>
    {/if}
    <form onsubmit={create}>
      <input type="text" aria-label="New story name" placeholder="New story" maxlength="60" bind:value={name} />
      <Button type="submit" variant="secondary" disabled={!name.trim()}>Add</Button>
    </form>
    <Button variant="quiet" onclick={() => (open = false)}>Cancel</Button>
    {#if error}<span class="err" role="alert">{error}</span>{/if}
  </span>
{/if}

<style>
  .open {
    font: 600 12.5px var(--font-sans);
    color: var(--accent);
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    min-height: 24px;
  }
  .open:hover {
    text-decoration: underline;
  }
  .link {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }
  form {
    display: inline-flex;
    gap: var(--space-2);
  }
  select,
  input {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    padding: var(--space-1) var(--space-2);
  }
  .err {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
</style>
