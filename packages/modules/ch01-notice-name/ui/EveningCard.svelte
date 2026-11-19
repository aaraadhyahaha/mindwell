<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Card, SectionLabel } from '@mindwell/ui';
  import { capturesOnDay, listStories } from '../repo';
  import type { CaptureRecord, StoryRecord } from '../schema';
  import LinkStory from './LinkStory.svelte';

  let { store, day }: ModuleViewProps = $props();
  let captures = $state<CaptureRecord[]>([]);
  let stories = $state<StoryRecord[]>([]);

  async function load() {
    [captures, stories] = await Promise.all([capturesOnDay(store, day), listStories(store)]);
  }

  $effect(() => {
    void day;
    void load();
  });

  const groups = $derived.by(() => {
    const out: { key: string; name: string | null; items: CaptureRecord[] }[] = [];
    for (const s of stories) {
      const items = captures.filter((c) => c.story_id === s.id);
      if (items.length) out.push({ key: s.id, name: s.name, items });
    }
    const loose = captures.filter((c) => !c.story_id || !stories.some((s) => s.id === c.story_id));
    if (loose.length) out.push({ key: 'none', name: null, items: loose });
    return out;
  });
</script>

<Card>
  <p class="title">Thoughts you named today</p>
  {#each groups as g (g.key)}
    <div class="group">
      <SectionLabel as="h3">{g.name ?? 'Not linked to a story'}</SectionLabel>
      <ul>
        {#each g.items as c (c.id)}
          <li>
            <span>{c.text}</span>
            {#if !g.name}
              <LinkStory {store} {day} captureId={c.id} {stories} onlinked={load} />
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</Card>

<style>
  .title {
    font-family: var(--font-serif);
  }
  .group {
    margin-top: var(--space-3);
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
