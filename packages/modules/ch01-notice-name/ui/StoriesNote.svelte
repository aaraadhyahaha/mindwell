<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { MarginNote, Meter } from '@mindwell/ui';
  import { storyBars } from '../signals';

  let { signals }: ModuleViewProps = $props();
  const bars = $derived(storyBars(signals));
</script>

<MarginNote label="Stories this week">
  {#each bars as b (b.name)}
    <Meter label={b.name} value={b.count} fraction={b.fraction} />
  {/each}
</MarginNote>
