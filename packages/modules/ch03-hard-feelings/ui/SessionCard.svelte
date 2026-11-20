<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Button, Card } from '@mindwell/ui';
  import { SERIES_PROMPTS } from '../schema';
  import { seriesActive } from '../signals';

  let { signals }: ModuleViewProps = $props();
  const s = $derived(seriesActive(signals));
</script>

{#if s}
  <Card>
    <p class="label">Writing series · {s.topic}</p>
    <p class="say">Day {s.day_n} of {s.planned}: {SERIES_PROMPTS[s.day_n - 1]}</p>
    <div class="act">
      <Button variant="secondary" href="/m/ch03?tab=writing">Start 15-min timer</Button>
    </div>
  </Card>
{/if}

<style>
  .label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 0;
  }
  .say {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.4;
    margin: 6px 0 0;
  }
  .act {
    margin-top: var(--space-3);
  }
</style>
