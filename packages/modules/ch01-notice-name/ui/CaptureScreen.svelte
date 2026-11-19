<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Button } from '@mindwell/ui';
  import { addCapture, createStory, linkCapture, listStories, storyMatchFor } from '../repo';
  import type { CaptureRecord, StoryRecord } from '../schema';

  let { store, day }: ModuleViewProps = $props();

  let text = $state('');
  let intensity = $state<number | null>(null);
  let error = $state<string | null>(null);
  let saved = $state<CaptureRecord | null>(null);
  let matchName = $state<string | null>(null);
  let matchId = $state<string | null>(null);
  let stories = $state<StoryRecord[]>([]);
  let other = $state('');
  let newName = $state('');
  let busy = false;

  function focusOnMount(node: HTMLElement) {
    node.focus();
  }

  function done() {
    window.dispatchEvent(new CustomEvent('mindwell:done'));
  }

  async function save(ev: SubmitEvent) {
    ev.preventDefault();
    if (busy || saved || !text.trim()) return;
    busy = true;
    try {
      const capture = await addCapture(store, { text, intensity, at: new Date() });
      saved = capture;
      error = null;
      let id: string | null = null;
      let all: StoryRecord[] = [];
      try {
        id = await storyMatchFor(store, capture.text);
        all = await listStories(store);
      } catch {
        id = null;
      }
      const hit = id ? all.find((s) => s.id === id) : undefined;
      if (!hit) return done();
      stories = all;
      matchId = hit.id;
      matchName = hit.name;
    } catch {
      error = 'Could not save that. Please try again.';
    } finally {
      busy = false;
    }
  }

  async function link(storyId: string) {
    if (!saved) return;
    try {
      await linkCapture(store, saved.id, storyId);
      done();
    } catch {
      error = 'Could not link that. It was saved without a story.';
    }
  }

  async function newStory(ev: SubmitEvent) {
    ev.preventDefault();
    try {
      const s = await createStory(store, newName, day);
      await link(s.id);
    } catch {
      error = 'Could not create that story. Use 1 to 60 characters.';
    }
  }

  function onkeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      done();
      return;
    }
    const n = Number(ev.key);
    if (!saved && text === '' && ev.target instanceof HTMLInputElement && n >= 1 && n <= 5) {
      ev.preventDefault();
      intensity = intensity === n ? null : n;
    }
  }
</script>

<svelte:window {onkeydown} />

<main>
  {#if !saved}
    <form onsubmit={save}>
      <label for="capture-text">There's the <span class="blank">&nbsp;___&nbsp;</span> thought.</label>
      <input
        id="capture-text"
        type="text"
        autocomplete="off"
        maxlength="280"
        placeholder="name it in a few words"
        bind:value={text}
        use:focusOnMount
      />
      <div class="intensity" role="group" aria-label="Intensity, optional">
        <span class="muted">Intensity</span>
        {#each [1, 2, 3, 4, 5] as n (n)}
          <button
            type="button"
            class="dot"
            aria-pressed={intensity === n}
            onclick={() => (intensity = intensity === n ? null : n)}>{n}</button
          >
        {/each}
        <span class="muted hint">Enter to save, Esc to close</span>
      </div>
    </form>
  {:else if matchName}
    <p class="ask">Link to '{matchName}'?</p>
    <div class="row">
      <button type="button" class="primary" use:focusOnMount onclick={() => matchId && link(matchId)}>Link</button>
    </div>
    <div class="row">
      <select aria-label="Other story" bind:value={other} onchange={() => other && void link(other)}>
        <option value="">Other story</option>
        {#each stories.filter((s) => s.id !== matchId) as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
      </select>
      <form onsubmit={newStory} class="row">
        <input type="text" aria-label="New story name" placeholder="New story" maxlength="60" bind:value={newName} />
        <Button type="submit" variant="secondary" disabled={!newName.trim()}>Add</Button>
      </form>
    </div>
  {/if}
  {#if error}<p class="muted" role="alert">{error}</p>{/if}
</main>

<style>
  main {
    background: var(--bg);
    color: var(--ink);
    min-height: 100vh;
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  form.row {
    flex-direction: row;
  }
  label,
  .ask {
    font-family: var(--font-serif);
    font-size: var(--text-16);
  }
  .blank {
    border-bottom: 1px solid var(--muted);
  }
  input,
  select {
    font-family: var(--font-serif);
    font-size: var(--text-16);
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-3);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .intensity {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .muted {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  .hint {
    margin-left: auto;
  }
  .primary {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--bg);
    cursor: pointer;
  }
  .dot {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    width: 1.75rem;
    padding: 0;
    border: 1px solid var(--rule);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .dot[aria-pressed='true'] {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
</style>
