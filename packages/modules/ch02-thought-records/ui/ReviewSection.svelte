<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { signalNumber } from '@mindwell/core';
  import { storyTrend } from '../signals';

  let { signals }: ModuleViewProps = $props();
  const count = $derived(signalNumber(signals, 'ch02.records_7d') ?? 0);
  const drop = $derived(signalNumber(signals, 'ch02.avg_drop_7d'));
  const trends = $derived(storyTrend(signals));
</script>

{#if count === 0}
  <p class="muted">No thought records this week.</p>
{:else}
  <ul>
    <li>
      <span class="name">{count} {count === 1 ? 'thought record' : 'thought records'} this week</span>
      {#if typeof drop === 'number'}<span class="muted">average drop {Math.round(drop)} points</span>{/if}
    </li>
    {#each trends as t (t.story_id)}
      <li>
        <span class="name">{t.name}</span>
        <span class="muted">{t.first_before} → {t.last_after} ({t.n} records)</span>
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
