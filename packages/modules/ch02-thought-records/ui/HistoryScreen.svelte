<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { addDays } from '@mindwell/core';
  import { Button, LineChart, Opener, WhyLink } from '@mindwell/ui';
  import { dayLabel, draftStep, groupByDay, storyCharts } from '../history';
  import { manifest } from '../manifest';
  import { discardRecord, listRecords } from '../repo';
  import type { ThoughtRecord } from '../schema';
  import { storyNames } from '../signals';

  let { store, day, signals }: ModuleViewProps = $props();
  let records = $state<ThoughtRecord[]>([]);
  let loaded = $state(false);

  async function load() {
    records = await listRecords(store);
    loaded = true;
  }

  $effect(() => {
    void day;
    void load();
  });

  const names = $derived(storyNames(signals));
  const drafts = $derived(records.filter((r) => r.complete !== 1));
  const groups = $derived(groupByDay(records));
  const charts = $derived(storyCharts(records, names));
  const thisWeek = $derived(
    records.filter((r) => r.complete === 1 && r.day >= addDays(day, -6) && r.day <= day).length,
  );
  const hasComplete = $derived(groups.length > 0);
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? null) : null);

  async function discard(id: string) {
    await discardRecord(store, id);
    await load();
  }
</script>

<div class="page">
  <div class="opener-row">
    <Opener
      label="Chapter 2"
      title="Thought records"
      lede="Thoughts are guesses. Here's how yours held up."
      ruleBelow={0}
    >
      {#snippet aside()}<WhyLink {manifest} />{/snippet}
    </Opener>
    <div class="new"><Button variant="secondary" icon="plus" href="/m/ch02/new">New thought record</Button></div>
  </div>

  {#if drafts.length > 0}
    <section class="drafts" aria-label="Unfinished records">
      <div class="colhead"><h2>Unfinished</h2><span>{drafts.length}</span></div>
      {#each drafts as r (r.id)}
        <div class="srow">
          <div>
            {#if r.automatic_thought.trim()}
              <q>{r.automatic_thought}</q>
            {:else}
              <p class="none">No thought written yet</p>
            {/if}
            <p class="meta">Started {dayLabel(r.day, day)} · next: <i class="n">{draftStep(r).split(' ')[0]}</i> {draftStep(r).split(' ').slice(1).join(' ')}</p>
          </div>
          <span class="acts">
            <a class="link" href="/m/ch02/new?id={r.id}">Resume</a>
            <button class="link" type="button" onclick={() => discard(r.id)}>Discard</button>
          </span>
        </div>
      {/each}
    </section>
  {/if}

  {#if loaded && records.length === 0}
    <section class="blank" aria-label="No records yet">
      <p class="serif">No thought records yet. The next time a thought hits hard, check it here.</p>
      <Button variant="secondary" href="/m/ch02/new">New thought record</Button>
    </section>
  {:else if loaded}
    <section aria-label="Records">
      <div class="colhead"><h2>Records</h2><span>{thisWeek} this week</span></div>
      {#if !hasComplete}<p class="empty">No finished records yet.</p>{/if}
      {#each groups as [d, items] (d)}
        <p class="day">{dayLabel(d, day)}</p>
        {#each items as r (r.id)}
          <div class="cap">
            <div>
              <q>{r.automatic_thought}</q>
              <div class="meta">
                <span>{r.feeling} · {r.intensity_before} → {r.intensity_after}</span>
                {#if nameOf(r.story_id)}<span class="chip">{nameOf(r.story_id)}</span>{/if}
                <a class="link" href="/m/ch02/new?id={r.id}">Open</a>
              </div>
            </div>
          </div>
        {/each}
      {/each}
    </section>

    <section aria-label="Stories">
      <div class="colhead"><h2>Stories</h2><span>before → after</span></div>
      {#if charts.length === 0}
        <p class="empty">A story needs two records before it gets a line.</p>
      {/if}
      {#each charts as c (c.story_id)}
        <div class="chartrow">
          <h3>{c.name}</h3>
          <p>{c.n} records · first {c.first_before}, latest {c.last_after}</p>
          <LineChart
            series={c.series}
            yMin={0}
            yMax={100}
            height={120}
            label="{c.name}: intensity before and after each record"
          />
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 48px 72px;
    padding: 52px 64px 72px;
    max-width: 1188px;
    margin: 0 auto;
    width: 100%;
    align-items: start;
  }
  .opener-row,
  .drafts,
  .blank {
    grid-column: 1 / -1;
  }
  .new {
    margin-top: 0;
  }
  .blank {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .serif {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.5;
    margin: 0;
  }
  .colhead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid var(--ink);
    padding-bottom: 10px;
  }
  .colhead h2 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 20px;
    line-height: 1.5;
    margin: 0;
  }
  .colhead span {
    font-size: 12.5px;
    color: var(--muted);
  }
  .empty {
    font-size: 13px;
    color: var(--muted);
    margin: 14px 0 0;
  }
  .srow {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid var(--rule);
  }
  .srow q,
  .cap q {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.45;
    display: block;
  }
  .none {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 17px;
    line-height: 1.45;
    color: var(--muted);
    margin: 0;
  }
  .srow .meta {
    font-size: 12.5px;
    color: var(--muted);
    margin: 4px 0 0;
  }
  .acts {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .n {
    font-family: var(--font-serif);
    color: var(--accent);
  }
  .day {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 26px 0 4px;
  }
  .cap {
    padding: 12px 0;
    border-bottom: 1px solid var(--rule);
  }
  .cap .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-top: 6px;
    font-size: 12.5px;
    color: var(--muted);
  }
  .chip {
    font: 600 12px/1 var(--font-sans);
    padding: 5px 9px;
    border-radius: 999px;
    border: 1px solid var(--rule);
    background: var(--surface);
    color: var(--ink);
  }
  .link {
    font: 600 12.5px var(--font-sans);
    color: var(--accent);
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
  }
  .link:hover {
    text-decoration: underline;
  }
  .chartrow {
    padding: 18px 0;
    border-bottom: 1px solid var(--rule);
  }
  .chartrow h3 {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 19px;
    line-height: 1.5;
    margin: 0;
  }
  .chartrow p {
    font-size: 12.5px;
    color: var(--muted);
    margin: 2px 0 8px;
  }
</style>
