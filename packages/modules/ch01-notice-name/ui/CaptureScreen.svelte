<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { addCapture, createStory, linkCapture, listStories, storyMatchFor } from '../repo';
  import type { StoryRecord } from '../schema';

  let { store, day }: ModuleViewProps = $props();

  let text = $state('');
  let intensity = $state<number | null>(null);
  let error = $state<string | null>(null);
  let stories = $state<StoryRecord[]>([]);
  /** The story the text looks like, offered as "Story: X?". */
  let suggested = $state<StoryRecord | null>(null);
  /** The story the capture will be linked to. */
  let chosen = $state<StoryRecord | null>(null);
  /** "Other": pick from the list or name a new story. */
  let picking = $state(false);
  let pick = $state('');
  let newName = $state('');
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const NEW = '__new__';

  $effect(() => {
    void listStories(store).then((s) => (stories = s)).catch(() => {});
  });

  // Suggest a story as the thought is typed (once the typing pauses).
  $effect(() => {
    const t = text.trim();
    clearTimeout(timer);
    if (!t) {
      suggested = null;
      return;
    }
    timer = setTimeout(async () => {
      const id = await storyMatchFor(store, t).catch(() => null);
      suggested = stories.find((s) => s.id === id) ?? null;
    }, 250);
    return () => clearTimeout(timer);
  });

  function focusOnMount(node: HTMLElement) {
    node.focus();
  }

  function done() {
    window.dispatchEvent(new CustomEvent('mindwell:done'));
  }

  async function save(ev: SubmitEvent) {
    ev.preventDefault();
    if (busy || !text.trim()) return;
    busy = true;
    try {
      const capture = await addCapture(store, { text, intensity, at: new Date() });
      try {
        let storyId = chosen?.id ?? null;
        if (picking && pick === NEW && newName.trim()) storyId = (await createStory(store, newName, day)).id;
        if (storyId) await linkCapture(store, capture.id, storyId);
      } catch {
        error = 'Saved, but not linked to a story. Link it on the Thoughts screen.';
        return;
      }
      done();
    } catch {
      error = 'Could not save that. Please try again.';
    } finally {
      busy = false;
    }
  }

  function onpick() {
    if (pick && pick !== NEW) {
      chosen = stories.find((s) => s.id === pick) ?? null;
      picking = false;
    }
  }

  function onkeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      done();
      return;
    }
    const n = Number(ev.key);
    if (text === '' && ev.target instanceof HTMLInputElement && ev.target.id === 'capture-text' && n >= 1 && n <= 5) {
      ev.preventDefault();
      intensity = intensity === n ? null : n;
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="wrap">
  <div class="cw" role="dialog" aria-label="Capture a thought">
  <form onsubmit={save}>
    <p class="label">Notice and name</p>
    <label class="q"
      ><span>There's the</span><input
        id="capture-text"
        type="text"
        autocomplete="off"
        maxlength="280"
        placeholder="name it in a few words"
        aria-label="The thought"
        bind:value={text}
        use:focusOnMount
      /><span>thought.</span></label
    >
    <div class="row">
      <div class="int" role="radiogroup" aria-label="Intensity">
        <span style="margin-right:4px">Intensity</span>
        {#each [1, 2, 3, 4, 5] as n (n)}
          <button
            type="button"
            role="radio"
            class:on={intensity === n}
            aria-checked={intensity === n}
            onclick={() => (intensity = intensity === n ? null : n)}>{n}</button
          >
        {/each}
      </div>
      <div class="sug">
        {#if picking}
          <select aria-label="Story" bind:value={pick} onchange={onpick}>
            <option value="">Choose a story</option>
            {#each stories as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
            <option value={NEW}>New story…</option>
          </select>
          {#if pick === NEW}
            <input class="new" type="text" aria-label="New story name" placeholder="Name the story" maxlength="60" bind:value={newName} />
          {/if}
        {:else if chosen}
          Story: <b>{chosen.name}</b><button type="button" onclick={() => (picking = true)}>Change</button>
        {:else if suggested}
          Story: <b>{suggested.name}</b>?<button type="button" onclick={() => (chosen = suggested)}>Yes</button><button
            type="button"
            onclick={() => (picking = true)}>Other</button
          >
        {:else}
          Story:<button type="button" onclick={() => (picking = true)}>Choose</button>
        {/if}
      </div>
    </div>
    {#if error}<p class="err" role="alert">{error}</p>{/if}
    <div class="keys">
      <span><span class="kbd">Enter</span>Save</span><span><span class="kbd">Tab</span>Intensity and story</span><span
        ><span class="kbd">Esc</span>Close</span
      >
    </div>
  </form>
  </div>
</div>

<style>
  /* In the main window the card sits on the page; the capture window is the card. */
  .wrap {
    padding: 40px;
  }
  :global(html[data-window='aux']) .wrap {
    padding: 0;
  }
  .cw {
    width: 560px;
    height: 240px;
    box-sizing: border-box;
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 14px;
    padding: 22px 26px 18px;
    font-family: var(--font-sans);
    line-height: normal;
    color: var(--ink);
    display: flex;
    flex-direction: column;
  }
  :global(html[data-window='aux']) .cw {
    width: 100vw;
    height: 100vh;
  }
  /* The form's rows are the card's flex rows. */
  form {
    display: contents;
  }
  .label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 0;
  }
  .q {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-family: var(--font-serif);
    font-size: 22px;
    margin-top: 12px;
    border-bottom: 1px solid var(--ink);
    padding-bottom: 8px;
  }
  .q:focus-within {
    border-bottom-color: var(--accent);
  }
  .q span {
    color: var(--muted);
    font-style: italic;
    white-space: nowrap;
  }
  .q input {
    flex: 1;
    border: 0;
    background: none;
    font: 400 22px var(--font-serif);
    color: var(--ink);
    outline: none;
    min-width: 0;
    padding: 0;
  }
  .q input::placeholder {
    color: var(--placeholder);
    font-style: italic;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    gap: 12px;
  }
  .int {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 12.5px;
    color: var(--muted);
  }
  .int button {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid var(--rule);
    background: var(--bg);
    font: 400 13px var(--font-serif);
    color: var(--ink);
    cursor: pointer;
  }
  .int button:hover:not(.on) {
    border-color: var(--muted);
  }
  .int button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .sug {
    font-size: 13px;
    color: var(--muted);
    white-space: nowrap;
  }
  .sug b {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 400;
    color: var(--ink);
  }
  .sug button {
    font: 600 13px var(--font-sans);
    color: var(--accent);
    background: none;
    border: 0;
    cursor: pointer;
    padding: 0 0 0 6px;
  }
  .sug button:hover {
    text-decoration: underline;
  }
  .sug select,
  .sug .new {
    font: 400 13px var(--font-sans);
    color: var(--ink);
    background: var(--bg);
    border: 1px solid var(--rule);
    border-radius: 6px;
    padding: 4px 6px;
    margin-left: 6px;
    max-width: 150px;
  }
  .err {
    font-size: 12.5px;
    color: var(--muted);
    margin: 8px 0 0;
  }
  .keys {
    margin-top: auto;
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--muted);
    border-top: 1px solid var(--rule);
    padding-top: 12px;
  }
  .kbd {
    font: 500 11.5px/1 var(--font-sans);
    border: 1px solid var(--rule);
    border-radius: 5px;
    padding: 3px 6px;
    background: var(--bg);
    margin-right: 5px;
    color: var(--muted);
  }
</style>
