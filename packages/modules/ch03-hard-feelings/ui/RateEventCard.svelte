<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Button, Card, Choice, Scale } from '@mindwell/ui';
  import { rateEvent } from '../repo';
  import type { ReframeHelped } from '../schema';
  import { clock, eventsToRate } from '../signals';
  import { HELPED_OPTIONS } from '../view';

  let { store, signals }: ModuleViewProps = $props();
  const events = $derived(eventsToRate(signals));

  let saved = $state<string[]>([]);
  let outcome = $state<Record<string, number | null>>({});
  let helped = $state<Record<string, string | null>>({});

  async function save(id: string) {
    const o = outcome[id];
    const h = helped[id];
    if (o == null || h == null) return;
    await rateEvent(store, id, { outcome_rating: o, reframe_helped: h as ReframeHelped });
    saved = [...saved, id];
  }
</script>

{#each events as e (e.id)}
  <Card>
    <p class="label">After the event</p>
    <p class="title">{e.title} <span class="time">{clock(e.starts_at)}</span></p>
    {#if saved.includes(e.id)}
      <p class="muted">Saved.</p>
    {:else}
      <div class="form">
        <Scale label="How did it go?" mode="1-5" bind:value={() => outcome[e.id] ?? null, (v) => (outcome[e.id] = v ?? null)} minLabel="Badly" maxLabel="Well" />
        <Choice label="Did calling it excitement help?" options={HELPED_OPTIONS} bind:value={() => helped[e.id] ?? null, (v) => (helped[e.id] = typeof v === 'string' ? v : null)} />
        <Button variant="secondary" disabled={outcome[e.id] == null || helped[e.id] == null} onclick={() => save(e.id)}>Save</Button>
      </div>
    {/if}
  </Card>
{/each}

<style>
  .label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 0;
  }
  .title {
    font-family: var(--font-serif);
    font-size: 17px;
    margin: 6px 0 0;
  }
  .time {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
    margin-left: 6px;
  }
  .form {
    display: grid;
    gap: 18px;
    margin-top: var(--space-3);
    max-width: 400px;
    justify-items: stretch;
  }
  .form > :global(:last-child) {
    justify-self: start;
  }
  .muted {
    font-size: var(--text-14);
    color: var(--muted);
    margin: 8px 0 0;
  }
</style>
