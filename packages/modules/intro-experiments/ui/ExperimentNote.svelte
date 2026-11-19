<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { MarginNote, Meter } from '@mindwell/ui';
  import { experimentProgress } from '../signals';

  let { signals, day }: ModuleViewProps = $props();
  const running = $derived(experimentProgress(signals, day));
</script>

<MarginNote label={running.length > 1 ? 'Experiments' : 'Experiment'}>
  {#each running as e (e.id)}
    <p>{e.label}</p>
    <p class="meta">Day {e.day} of {e.of}</p>
    <Meter fraction={e.fraction} />
  {/each}
</MarginNote>
