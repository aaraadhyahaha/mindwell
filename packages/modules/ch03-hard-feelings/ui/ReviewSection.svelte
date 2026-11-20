<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { addDays } from '@mindwell/core';
  import { RatingDots, Tag } from '@mindwell/ui';
  import { eventsBetween, gratitudeBetween, listSeries, sessionsBetween, sessionsForSeries } from '../repo';
  import type { StressEvent } from '../schema';
  import { clock } from '../signals';
  import { dayLabel, gratitudeSummary, HELPED_LABELS, sessionLines } from '../view';
  import type { SessionLine } from '../view';

  let { store, day }: ModuleViewProps = $props();
  let events = $state<StressEvent[]>([]);
  let lines = $state<SessionLine[]>([]);
  let gratitude = $state(0);
  let loaded = $state(false);

  async function load() {
    const from = addDays(day, -6);
    const [ev, week, series, days] = await Promise.all([
      eventsBetween(store, from, day),
      sessionsBetween(store, from, day),
      listSeries(store),
      gratitudeBetween(store, from, day),
    ]);
    const ids = [...new Set(week.map((s) => s.series_id))];
    const all = (await Promise.all(ids.map((id) => sessionsForSeries(store, id)))).flat();
    events = ev;
    lines = sessionLines(week, all, series);
    gratitude = days.length;
    loaded = true;
  }

  $effect(() => {
    void day;
    void load();
  });
</script>

{#if loaded}
  <div class="block">
    <h3>Events this week</h3>
    {#if events.length === 0}
      <p class="muted">No events this week.</p>
    {:else}
      <ul>
        {#each events as e (e.id)}
          <li>
            <span class="name">{e.title}</span>
            <span class="muted line">
              {dayLabel(e.day, day)}
              {#if e.outcome_rating !== null}
                <RatingDots value={e.outcome_rating} />
                {#if e.reframe_helped}<Tag>{HELPED_LABELS[e.reframe_helped]}</Tag>{/if}
              {:else if Date.parse(e.starts_at) > Date.now()}
                · {clock(e.starts_at)}
              {:else}
                · not rated
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <div class="block">
    <h3>Writing sessions</h3>
    {#if lines.length === 0}
      <p class="muted">No writing sessions this week.</p>
    {:else}
      <ul>
        {#each lines as l (l.id)}
          <li>
            <span class="name">{l.topic} · Day {l.day_n}</span>
            <span class="muted">mood {l.mood_before} → {l.mood_after ?? 'not finished'} · {l.minutes} min</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <div class="block">
    <h3>Gratitude</h3>
    <p class="muted">{gratitudeSummary(gratitude)}</p>
  </div>
{/if}

<style>
  .block {
    border-top: 1px solid var(--rule, var(--ink));
    padding: var(--space-2) 0;
  }
  h3 {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: var(--space-2) 0;
  }
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
    margin: 0;
  }
  .line {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
</style>
