<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { addDays } from '@mindwell/core';
  import { Button, Opener, WhyLink } from '@mindwell/ui';
  import { manifest } from '../manifest';
  import { archiveStory, capturesBetween, createStory, listStories, renameStory, storyMatchFor } from '../repo';
  import type { CaptureRecord, StoryRecord } from '../schema';
  import { capturesByDay, clockTime, dayLabel, sparkHeights, storyRows } from '../thoughts';
  import LinkStory from './LinkStory.svelte';

  let { store, day }: ModuleViewProps = $props();
  let stories = $state<StoryRecord[]>([]);
  let captures = $state<CaptureRecord[]>([]);
  /** Unlinked capture id → the name of the story it looks like. */
  let looksLike = $state<Record<string, string>>({});
  let editing = $state<string | null>(null);
  let draft = $state('');
  let naming = $state(false);
  let newName = $state('');
  let error = $state<string | null>(null);

  async function load() {
    [stories, captures] = await Promise.all([listStories(store), capturesBetween(store, addDays(day, -29), day)]);
    const hints: Record<string, string> = {};
    for (const c of captures.filter((x) => !x.story_id)) {
      const id = await storyMatchFor(store, c.text).catch(() => null);
      const name = stories.find((s) => s.id === id)?.name;
      if (name) hints[c.id] = name;
    }
    looksLike = hints;
  }

  $effect(() => {
    void day;
    void load();
  });

  const rows = $derived(storyRows(stories, captures, day));
  const max = $derived(Math.max(0, ...rows.flatMap((r) => r.perDay)));
  const history = $derived(capturesByDay(captures, day));
  const thisWeek = $derived(captures.filter((c) => c.day >= addDays(day, -6) && c.day <= day).length);
  const storyName = (id: string | null) => stories.find((s) => s.id === id)?.name ?? null;

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      error = null;
      editing = null;
      naming = false;
      newName = '';
      await load();
    } catch {
      error = 'Could not save that. Story names are 1 to 60 characters.';
    }
  }
</script>

<div class="page">
  <div class="opener-row">
    <Opener
      label="Chapter 1"
      title="Thoughts you've named"
      lede="You can't erase a thought. You can notice it, name it, and carry on."
      ruleBelow={0}
    >
      {#snippet aside()}<WhyLink {manifest} />{/snippet}
    </Opener>
  </div>

  <section aria-label="Stories">
    <div class="colhead"><h2>Stories</h2><span>last 7 days</span></div>
    {#if rows.length === 0}
      <p class="empty">No stories yet. Link a captured thought to start one.</p>
    {/if}
    {#each rows as r (r.story.id)}
      {#if editing === r.story.id}
        <form
          class="srow edit"
          onsubmit={(e) => {
            e.preventDefault();
            void run(() => renameStory(store, r.story.id, draft));
          }}
        >
          <input type="text" aria-label="Story name" maxlength="60" bind:value={draft} />
          <span class="edit-acts">
            <button class="link" type="submit">Save</button>
            <button class="link" type="button" onclick={() => run(() => archiveStory(store, r.story.id))}>Archive</button>
            <button class="link" type="button" onclick={() => (editing = null)}>Cancel</button>
          </span>
        </form>
      {:else}
        <div class="srow">
          <div>
            <h3>
              <button
                type="button"
                class="name"
                title="Rename or archive"
                onclick={() => {
                  editing = r.story.id;
                  draft = r.story.name;
                }}>{r.story.name}</button
              >
            </h3>
            <p>{r.line}</p>
          </div>
          <div class="spark" role="img" aria-label="Captures per day, last 7 days: {r.perDay.join(', ')}">
            {#each sparkHeights(r.perDay, max) as h, i (i)}<i class:a={h > 0} style:height="{h}%"></i>{/each}
          </div>
          <span class="cnt">{r.week}</span>
        </div>
      {/if}
    {/each}
    {#if error}<p class="empty" role="alert">{error}</p>{/if}
    {#if naming}
      <form
        class="new"
        onsubmit={(e) => {
          e.preventDefault();
          void run(() => createStory(store, newName, day));
        }}
      >
        <input type="text" aria-label="New story name" placeholder="Name the story" maxlength="60" bind:value={newName} />
        <button class="link" type="submit" disabled={!newName.trim()}>Add</button>
        <button class="link" type="button" onclick={() => (naming = false)}>Cancel</button>
      </form>
    {:else}
      <div class="name-new"><Button variant="quiet" onclick={() => (naming = true)}>Name a new story</Button></div>
    {/if}
  </section>

  <section aria-label="Recent captures">
    <div class="colhead"><h2>Recent captures</h2><span>{thisWeek} this week</span></div>
    {#if history.length === 0}
      <p class="empty">Nothing captured in the last 30 days.</p>
    {/if}
    {#each history as [d, items] (d)}
      <p class="day">{dayLabel(d, day)}</p>
      {#each items as c (c.id)}
        <div class="cap">
          <time datetime={c.captured_at}>{clockTime(c.captured_at)}</time>
          <div>
            <q>{c.text}</q>
            <div class="meta">
              {#if storyName(c.story_id)}
                <span class="chip">{storyName(c.story_id)}</span>
                {#if c.intensity}<span>intensity {c.intensity}</span>{/if}
              {:else}
                <LinkStory {store} {day} captureId={c.id} {stories} onlinked={load} />
                {#if looksLike[c.id]}<span>· looks like "{looksLike[c.id]}"</span>{/if}
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/each}
  </section>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 72px;
    padding: 52px 64px 72px;
    max-width: 1188px;
    margin: 0 auto;
    width: 100%;
  }
  .opener-row {
    grid-column: 1 / -1;
  }
  .colhead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid var(--ink);
    padding-bottom: 10px;
  }
  .colhead h2 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 20px;
    line-height: 1.5;
    margin: 0;
  }
  .colhead span {
    font-size: 12.5px;
    color: var(--muted);
  }
  .empty {
    font-size: 13px;
    color: var(--muted);
    margin: 14px 0 0;
  }
  .srow {
    display: grid;
    grid-template-columns: 1fr 112px 44px;
    gap: 16px;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid var(--rule);
  }
  .srow h3 {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 19px;
    line-height: 1.5;
    margin: 0;
  }
  .name {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    text-align: left;
  }
  .name:hover {
    text-decoration: underline;
    text-decoration-color: var(--rule);
    text-underline-offset: 3px;
  }
  .srow p {
    font-size: 12.5px;
    color: var(--muted);
    margin: 2px 0 0;
  }
  .spark {
    display: flex;
    align-items: flex-end;
    gap: 5px;
    height: 28px;
  }
  .spark i {
    display: block;
    width: 11px;
    background: var(--rule);
    border-radius: 2px 2px 0 0;
  }
  .spark i.a {
    background: var(--accent);
  }
  .cnt {
    font-family: var(--font-serif);
    font-size: 24px;
    text-align: right;
    font-weight: 400;
  }
  .srow.edit {
    grid-template-columns: 1fr auto;
  }
  .edit-acts {
    display: flex;
    gap: 14px;
  }
  input {
    font: italic 400 19px var(--font-serif);
    color: var(--ink);
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--ink);
    border-radius: 0;
    padding: 4px 0;
    min-width: 0;
    width: 100%;
    outline: none;
  }
  input:focus-visible {
    border-bottom-color: var(--accent);
    box-shadow: 0 1px 0 0 var(--accent);
  }
  input::placeholder {
    color: var(--placeholder);
  }
  .new {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 14px;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid var(--rule);
  }
  .name-new {
    margin-top: 14px;
  }
  .day {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 26px 0 4px;
  }
  .cap {
    display: grid;
    grid-template-columns: 52px 1fr;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--rule);
  }
  .cap time {
    font-size: 13px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    padding-top: 3px;
  }
  .cap q {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.45;
    display: block;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-top: 6px;
    font-size: 12.5px;
    color: var(--muted);
  }
  .chip {
    font: 600 12px/1 var(--font-sans);
    padding: 5px 9px;
    border-radius: 999px;
    border: 1px solid var(--rule);
    background: var(--surface);
    color: var(--ink);
  }
  .link {
    font: 600 12.5px var(--font-sans);
    color: var(--accent);
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    min-height: 24px;
  }
  .link:disabled {
    opacity: 0.45;
    cursor: default;
  }
</style>
