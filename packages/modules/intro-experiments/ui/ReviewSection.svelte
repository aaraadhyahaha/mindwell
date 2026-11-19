<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { addDays } from '@mindwell/core';
  import { Button, Card, Field, Scale } from '@mindwell/ui';
  import { activeExperiments, listCheckins, saveCheckin } from '../repo';
  import type { ExperimentRecord } from '../schema';
  import VerdictForm from './VerdictForm.svelte';

  let { store, day }: ModuleViewProps = $props();

  let running = $state<ExperimentRecord[]>([]);
  let due = $state<ExperimentRecord[]>([]);
  let ratings = $state<Record<string, number | null>>({});
  let notes = $state<Record<string, string>>({});
  let saved = $state<Record<string, boolean>>({});
  let error = $state<string | null>(null);

  async function load() {
    const all = await activeExperiments(store);
    running = all.filter((e) => e.end_day > day);
    due = all.filter((e) => e.end_day <= day);
    const from = addDays(day, -6);
    for (const e of running) {
      const mine = (await listCheckins(store, e.id)).filter((c) => c.day >= from && c.day <= day);
      const last = mine[mine.length - 1];
      ratings[e.id] = last?.rating ?? null;
      notes[e.id] = last?.note ?? '';
    }
  }

  async function save(e: ExperimentRecord) {
    const rating = ratings[e.id];
    if (!rating) return;
    try {
      await saveCheckin(store, { experimentId: e.id, day, rating, note: notes[e.id] ?? '' });
      saved[e.id] = true;
      error = null;
    } catch {
      error = 'Could not save that. Please try again.';
    }
  }

  $effect(() => {
    void day;
    void load();
  });
</script>

{#if running.length === 0 && due.length === 0}
  <p class="muted">No experiments are running.</p>
{/if}
{#each running as e (e.id)}
  <Card>
    <p class="name">{e.label}</p>
    <p class="muted">{e.hypothesis}</p>
    <div class="stack">
      <Scale
        label="Is this helping?"
        mode="1-5"
        minLabel="Not at all"
        maxLabel="Clearly"
        bind:value={ratings[e.id]}
      />
      <Field label="Note (optional)" bind:value={notes[e.id]} multiline rows={2} />
      <div class="row">
        <Button disabled={!ratings[e.id]} onclick={() => save(e)}>Save check-in</Button>
        {#if saved[e.id]}<span class="muted">Saved.</span>{/if}
      </div>
    </div>
  </Card>
{/each}
{#each due as e (e.id)}
  <Card>
    <p>Your experiment with {e.label} has finished. Keep, drop or extend?</p>
    <VerdictForm {store} id={e.id} ondone={load} />
  </Card>
{/each}
{#if error}<p class="muted" role="alert">{error}</p>{/if}

<style>
  .muted {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  .name {
    font-family: var(--font-serif);
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }
</style>
