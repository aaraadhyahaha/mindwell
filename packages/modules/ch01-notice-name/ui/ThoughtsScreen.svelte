<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { addDays } from '@mindwell/core';
  import { Button, Card, Page, SectionLabel } from '@mindwell/ui';
  import { archiveStory, capturesBetween, listStories, renameStory } from '../repo';
  import type { CaptureRecord, StoryRecord } from '../schema';
  import LinkStory from './LinkStory.svelte';

  let { store, day }: ModuleViewProps = $props();
  let stories = $state<StoryRecord[]>([]);
  let captures = $state<CaptureRecord[]>([]);
  let editing = $state<string | null>(null);
  let draft = $state('');
  let error = $state<string | null>(null);

  async function load() {
    [stories, captures] = await Promise.all([listStories(store), capturesBetween(store, addDays(day, -36), day)]);
  }

  $effect(() => {
    void day;
    void load();
  });

  const rows = $derived.by(() => {
    const from7 = addDays(day, -6);
    const from14 = addDays(day, -13);
    const from30 = addDays(day, -29);
    return stories.map((story) => {
      const mine = captures.filter((c) => c.story_id === story.id);
      const d7 = mine.filter((c) => c.day >= from7 && c.day <= day).length;
      const prev = mine.filter((c) => c.day >= from14 && c.day < from7).length;
      const d30 = mine.filter((c) => c.day >= from30 && c.day <= day).length;
      const trend = d7 > prev ? 'more' : d7 < prev ? 'fewer' : 'about the same';
      return { story, d7, d30, trend };
    });
  });

  const history = $derived.by(() => {
    const from = addDays(day, -29);
    const byDay = new Map<string, CaptureRecord[]>();
    for (const c of captures) {
      if (c.day < from || c.day > day) continue;
      byDay.set(c.day, [...(byDay.get(c.day) ?? []), c]);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  });

  const storyName = (id: string | null) => stories.find((s) => s.id === id)?.name ?? null;

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      error = null;
      editing = null;
      await load();
    } catch {
      error = 'Could not save that. Story names are 1 to 60 characters.';
    }
  }
</script>

<Page title="Thoughts">
  <SectionLabel as="h2">Stories</SectionLabel>
  {#if rows.length === 0}
    <p class="muted">No stories yet. Link a captured thought to start one.</p>
  {/if}
  {#each rows as r (r.story.id)}
    <Card>
      {#if editing === r.story.id}
        <form
          class="row"
          onsubmit={(e) => {
            e.preventDefault();
            void run(() => renameStory(store, r.story.id, draft));
          }}
        >
          <input type="text" aria-label="Story name" maxlength="60" bind:value={draft} />
          <Button type="submit">Save</Button>
          <Button variant="quiet" onclick={() => (editing = null)}>Cancel</Button>
        </form>
      {:else}
        <p class="name">{r.story.name}</p>
        <p class="muted">
          {r.d7} in the last 7 days, {r.d30} in the last 30. {r.trend === 'about the same'
            ? 'About the same'
            : r.trend === 'more'
              ? 'More'
              : 'Fewer'} than the 7 days before.
        </p>
        <div class="row">
          <Button
            variant="quiet"
            onclick={() => {
              editing = r.story.id;
              draft = r.story.name;
            }}>Rename</Button
          >
          <Button variant="quiet" onclick={() => run(() => archiveStory(store, r.story.id))}>Archive</Button>
        </div>
      {/if}
    </Card>
  {/each}
  {#if error}<p class="muted" role="alert">{error}</p>{/if}

  <SectionLabel as="h2">Recent captures</SectionLabel>
  {#if history.length === 0}
    <p class="muted">Nothing captured in the last 30 days.</p>
  {/if}
  {#each history as [d, items] (d)}
    <div class="day">
      <SectionLabel as="h3">{d}</SectionLabel>
      <ul>
        {#each items as c (c.id)}
          <li>
            <span>{c.text}</span>
            {#if storyName(c.story_id)}
              <span class="muted">{storyName(c.story_id)}</span>
            {:else}
              <LinkStory {store} {day} captureId={c.id} {stories} onlinked={load} />
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</Page>

<style>
  .muted {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  .name {
    font-family: var(--font-serif);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  input {
    font-family: var(--font-serif);
    font-size: var(--text-16);
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-3);
  }
  .day {
    margin-top: var(--space-4);
  }
  ul {
    list-style: none;
    padding: 0;
    margin: var(--space-1) 0 0;
  }
  li {
    font-family: var(--font-serif);
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-3);
    padding: var(--space-1) 0;
  }
</style>
