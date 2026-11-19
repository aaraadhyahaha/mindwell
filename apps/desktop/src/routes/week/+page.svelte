<script lang="ts">
  import { onMount } from 'svelte';
  import type { DayRecord, Signals, Store, SuggestionRecord } from '@mindwell/core';
  import {
    CORE_TABLES,
    buildSignals,
    decideSuggestion,
    localDay,
    reviewSuggestions,
    reviewWeek,
    weekSummary
  } from '@mindwell/core';
  import { Page, SectionLabel, Card, Button, LineChart } from '$lib/ui';
  import { activation } from '$lib/activation.svelte';
  import { getStore } from '$lib/db';
  import { weekRangeLabel } from '$lib/week';

  const day = localDay(new Date());
  const week = reviewWeek(day);
  const lastDay = week[week.length - 1]!;

  let store = $state.raw<Store | null>(null);
  let signals = $state.raw<Signals>({});
  let rows = $state.raw<DayRecord[]>([]);
  let suggestions = $state.raw<SuggestionRecord[]>([]);
  let error = $state<string | null>(null);

  const summary = $derived(weekSummary(day, rows));
  const hasRows = $derived(rows.some((r) => week.includes(r.day)));
  const points = $derived(
    summary.ratings.flatMap((y, x) => (y === null ? [] : [{ x, y }]))
  );
  const sections = $derived(
    activation.active
      .flatMap((m) => m.reviewSections)
      .toSorted((a, b) => a.order - b.order)
  );
  const total = $derived(summary.intents.kept + summary.intents.partly + summary.intents.not);

  onMount(async () => {
    try {
      if (!activation.loaded) await activation.load();
      const s = await getStore();
      rows = await s.list<DayRecord>(CORE_TABLES.days, { orderBy: { column: 'day', direction: 'desc' }, limit: 30 });
      const built = await buildSignals({ store: s, day, active: activation.active, chapters: activation.read });
      signals = built.signals;
      suggestions = (await reviewSuggestions({ store: s, day, active: activation.active, signals })).open;
      store = s;
    } catch {
      error = 'Could not load your week. Please try again.';
    }
  });

  async function decide(id: string, status: 'accepted' | 'dismissed') {
    if (!store) return;
    try {
      await decideSuggestion(store, id, status);
      suggestions = suggestions.filter((s) => s.id !== id);
      error = null;
    } catch {
      error = 'Could not save that. Please try again.';
    }
  }
</script>

<Page label={weekRangeLabel(week[0]!, lastDay)} title="This week">
  {#if error}<p class="note" role="alert">{error}</p>{/if}

  <section aria-labelledby="w-week">
    <SectionLabel as="h2"><span id="w-week">Your week</span></SectionLabel>
    {#if !hasRows}
      <p class="muted">Your check-ins and ratings for the week will gather here.</p>
    {:else}
      <div class="stack">
        <p>Check-ins: {summary.checkins} of 7 · Closes: {summary.closes} of 7</p>
        {#if total > 0}
          <p>
            Intents: {summary.intents.kept} kept, {summary.intents.partly} partly, {summary.intents.not} not today
          </p>
        {/if}
        {#if summary.meanRating !== null}<p>Average day: {summary.meanRating.toFixed(1)} of 5</p>{/if}
        <LineChart
          label="Day rating across the week"
          series={[{ label: 'Day', points }]}
          yMin={1}
          yMax={5}
          empty="No days rated yet this week."
        />
      </div>
    {/if}
  </section>

  {#if store}
    {#each sections as sec (sec.id)}
      {@const C = sec.component}
      <section aria-label={sec.title}>
        <SectionLabel as="h2">{sec.title}</SectionLabel>
        <C {store} day={lastDay} {signals} />
      </section>
    {/each}
  {/if}

  <section aria-labelledby="w-sug">
    <SectionLabel as="h2"><span id="w-sug">Suggestions</span></SectionLabel>
    {#if suggestions.length === 0}
      <p class="muted">Suggestions appear here when your records point to a change worth trying.</p>
    {:else}
      <p class="muted">Nothing changes unless you accept it.</p>
      <ul>
        {#each suggestions as s (s.id)}
          <li>
            <Card>
              <div class="stack">
                <p class="text">{s.text}</p>
                <p class="muted">{s.reason}</p>
                <div class="row">
                  <Button variant="secondary" onclick={() => void decide(s.id, 'accepted')}>Accept</Button>
                  <Button variant="quiet" onclick={() => void decide(s.id, 'dismissed')}>Dismiss</Button>
                </div>
              </div>
            </Card>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</Page>

<style>
  section {
    margin-bottom: var(--space-7);
  }
  section > :global(:not(:first-child)) {
    margin-top: var(--space-4);
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .row {
    display: flex;
    gap: var(--space-3);
  }
  ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  p {
    font-family: var(--font-sans);
    font-size: var(--text-16);
  }
  .muted,
  .note {
    font-size: var(--text-14);
    color: var(--muted);
  }
  .text {
    font-family: var(--font-serif);
    font-size: var(--text-16);
    line-height: var(--leading-body);
  }
</style>
