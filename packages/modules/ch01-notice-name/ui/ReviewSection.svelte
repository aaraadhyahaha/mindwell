<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { addDays } from '@mindwell/core';
  import { capturesBetween, listStories } from '../repo';
  import type { StoryRecord } from '../schema';

  let { store, day }: ModuleViewProps = $props();
  let rows = $state<{ story: StoryRecord; current: number; previous: number }[]>([]);
  let loaded = $state(false);

  async function load() {
    const curFrom = addDays(day, -6);
    const prevFrom = addDays(day, -13);
    const [stories, captures] = await Promise.all([listStories(store), capturesBetween(store, prevFrom, day)]);
    rows = stories
      .map((story) => {
        const mine = captures.filter((c) => c.story_id === story.id);
        const current = mine.filter((c) => c.day >= curFrom).length;
        return { story, current, previous: mine.length - current };
      })
      .filter((r) => r.current + r.previous > 0)
      .sort((a, b) => b.current - a.current || a.story.name.localeCompare(b.story.name))
      .slice(0, 5);
    loaded = true;
  }

  $effect(() => {
    void day;
    void load();
  });
</script>

{#if loaded && rows.length === 0}
  <p class="muted">No linked thoughts in the last two weeks.</p>
{:else}
  <ul>
    {#each rows as r (r.story.id)}
      <li>
        <span class="name">{r.story.name}</span>
        <span class="muted">
          {r.current} this week, {r.previous} the week before. First seen {r.story.first_seen_day}.
        </span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    display: flex;
    flex-direction: column;
    padding: var(--space-2) 0;
  }
  .name {
    font-family: var(--font-serif);
  }
  .muted {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
</style>
