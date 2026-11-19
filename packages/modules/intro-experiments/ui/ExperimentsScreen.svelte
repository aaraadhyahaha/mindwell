<script lang="ts">
  import type { ExperimentSignal, ModuleViewProps } from '@mindwell/core';
  import { daysBetween, signalList } from '@mindwell/core';
  import { Button, Card, Choice, Field, LineChart, Page, SectionLabel } from '@mindwell/ui';
  import { activeExperiments, endEarly, ExperimentLimitError, listCheckins, listExperiments, startExperiment } from '../repo';
  import { DEFAULT_LENGTH } from '../schema';
  import type { CheckinRecord, ExperimentRecord } from '../schema';
  import VerdictForm from './VerdictForm.svelte';

  let { store, day, signals }: ModuleViewProps = $props();

  let active = $state<ExperimentRecord[]>([]);
  let past = $state<ExperimentRecord[]>([]);
  let checkins = $state<Record<string, CheckinRecord[]>>({});

  let pick = $state<string | null>(null);
  let hypothesis = $state('');
  let days = $state('');
  let error = $state<string | null>(null);

  const offered = $derived(
    signalList(signals, 'experiments.available').flatMap((v): ExperimentSignal[] => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) return [];
      const o = v as Record<string, unknown>;
      if (typeof o.module !== 'string' || typeof o.technique !== 'string' || typeof o.label !== 'string') return [];
      const d = typeof o.default_days === 'number' ? o.default_days : DEFAULT_LENGTH;
      return [{ module: o.module, technique: o.technique, label: o.label, default_days: d }];
    }),
  );
  const available = $derived(
    offered.filter((o) => !active.some((a) => a.technique === o.technique && a.module === o.module)),
  );
  const options = $derived(available.map((o) => ({ value: `${o.module}:${o.technique}`, label: o.label })));
  const chosen = $derived(available.find((o) => `${o.module}:${o.technique}` === pick));
  const due = $derived(active.filter((e) => e.end_day <= day));
  const running = $derived(active.filter((e) => e.end_day > day));

  $effect(() => {
    if (chosen) days = String(chosen.default_days);
  });

  async function load() {
    active = await activeExperiments(store);
    const all = await listExperiments(store);
    past = all.filter((e) => e.status === 'ended');
    const next: Record<string, CheckinRecord[]> = {};
    for (const e of active) next[e.id] = await listCheckins(store, e.id);
    checkins = next;
  }

  function status(e: ExperimentRecord): string {
    const left = daysBetween(day, e.end_day);
    if (left < 0) return 'Finished: verdict due';
    if (left === 0) return 'Last day';
    return `${left} ${left === 1 ? 'day' : 'days'} left`;
  }

  function points(id: string) {
    return (checkins[id] ?? []).map((c) => ({ x: daysBetween(day, c.day), y: c.rating }));
  }

  async function start(ev: SubmitEvent) {
    ev.preventDefault();
    if (!chosen) {
      error = 'Choose a technique first.';
      return;
    }
    try {
      await startExperiment(store, {
        module: chosen.module,
        technique: chosen.technique,
        label: chosen.label,
        hypothesis,
        days: Number(days),
        day,
      });
      error = null;
      pick = null;
      hypothesis = '';
      days = '';
      await load();
    } catch (e) {
      error = e instanceof ExperimentLimitError ? e.message : e instanceof Error ? e.message : 'Could not save that. Please try again.';
    }
  }

  async function end(id: string) {
    try {
      await endEarly(store, id, day);
      error = null;
      await load();
    } catch {
      error = 'Could not save that. Please try again.';
    }
  }

  $effect(() => {
    void day;
    void load();
  });
</script>

<Page title="Experiments">
  <div class="sections">
    <section>
      <SectionLabel as="h2">Running</SectionLabel>
      {#if active.length === 0}
        <p class="muted">No experiments are running.</p>
      {/if}
      {#each running as e (e.id)}
        <Card>
          <p class="name">{e.label}</p>
          <p class="muted">{e.hypothesis}</p>
          <p class="muted">{status(e)}</p>
          {#if points(e.id).length >= 2}
            <LineChart
              series={[{ label: 'Rating', points: points(e.id) }]}
              yMin={1}
              yMax={5}
              height={60}
              label="Check-in ratings for {e.label}"
            />
          {/if}
          <Button variant="quiet" onclick={() => end(e.id)}>End early</Button>
        </Card>
      {/each}
      {#each due as e (e.id)}
        <Card>
          <p class="name">{e.label}</p>
          <p class="muted">{e.hypothesis}</p>
          <p class="muted">{status(e)}</p>
          <VerdictForm {store} id={e.id} ondone={load} />
        </Card>
      {/each}
    </section>

    <section>
      <SectionLabel as="h2">Start an experiment</SectionLabel>
      {#if available.length === 0}
        <p class="muted">
          {offered.length === 0
            ? 'Mark a chapter read to get techniques you can try.'
            : 'Every technique on offer is already running.'}
        </p>
      {:else}
        <Card>
          <form onsubmit={start}>
            <Choice label="Technique" {options} bind:value={pick} />
            <Field label="Hypothesis" bind:value={hypothesis} placeholder="I expect this to help me with..." hint="One line." />
            <Field label="Length in days" bind:value={days} hint="Default is {chosen?.default_days ?? DEFAULT_LENGTH}." />
            <div><Button type="submit">Start</Button></div>
          </form>
        </Card>
      {/if}
      {#if error}<p class="muted" role="alert">{error}</p>{/if}
    </section>

    {#if past.length > 0}
      <section>
        <SectionLabel as="h2">Past experiments</SectionLabel>
        {#each past as e (e.id)}
          <Card>
            <p class="name">{e.label}</p>
            <p class="muted">{e.start_day} to {e.end_day}. Verdict: {e.verdict ?? 'none'}.</p>
            {#if e.note}<p class="note">{e.note}</p>{/if}
          </Card>
        {/each}
      </section>
    {/if}
  </div>
</Page>

<style>
  .sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }
  section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .muted {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  .name {
    font-family: var(--font-serif);
  }
  .note {
    white-space: pre-line;
    margin-top: var(--space-2);
  }
</style>
