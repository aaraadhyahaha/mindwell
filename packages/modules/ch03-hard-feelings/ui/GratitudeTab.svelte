<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Button } from '@mindwell/ui';
  import { gratitudeDays, markGratitude, unmarkGratitude } from '../repo';
  import { gratitudeWeeks } from '../view';

  let { store, day }: ModuleViewProps = $props();
  const uid = $props.id();

  let days = $state<string[]>([]);
  let loaded = $state(false);

  const doneToday = $derived(days.includes(day));
  const weeks = $derived(gratitudeWeeks(days, day));

  async function load() {
    days = await gratitudeDays(store);
    loaded = true;
  }

  $effect(() => {
    void load();
  });

  async function done() {
    await markGratitude(store, day);
    await load();
  }

  async function undo() {
    await unmarkGratitude(store, day);
    await load();
  }
</script>

<div class="two">
  <section aria-labelledby="{uid}-now">
    <div class="colhead"><h2 id="{uid}-now">Gratitude</h2></div>
    <p class="big">Three things that went well today, and why each one happened.</p>
    <p class="note">Write it in your journal. Once or twice a week is enough.</p>
    <div class="formacts">
      {#if doneToday}
        <span class="meta">Done today</span>
        <button class="link" type="button" onclick={undo}>Undo</button>
      {:else}
        <Button variant="secondary" onclick={done}>Done for today</Button>
      {/if}
    </div>
  </section>

  <section aria-labelledby="{uid}-past">
    <div class="colhead"><h2 id="{uid}-past">Past weeks</h2></div>
    {#if loaded && weeks.length === 0}
      <p class="empty">Weeks you wrote a gratitude entry show up here.</p>
    {/if}
    {#each weeks as w (w.start)}
      <div class="row">
        <p class="t">{w.label} · {w.count} {w.count === 1 ? 'time' : 'times'}</p>
      </div>
    {/each}
  </section>
</div>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 48px 72px;
    align-items: start;
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
  .empty {
    font-size: 13px;
    color: var(--muted);
    margin: 14px 0 0;
  }
  .row {
    padding: 16px 0;
    border-bottom: 1px solid var(--rule);
  }
  .t {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.45;
    margin: 0;
  }
  .big {
    font-family: var(--font-serif);
    font-size: 22px;
    line-height: 1.4;
    margin: 24px 0 0;
  }
  .meta {
    font-size: 12.5px;
    color: var(--muted);
  }
  .formacts {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-top: 24px;
  }
  .note {
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--muted);
    margin: 8px 0 0;
  }
  .link {
    font: 600 12.5px var(--font-sans);
    color: var(--accent);
    text-decoration: none;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    min-height: 24px;
  }
  .link:hover {
    text-decoration: underline;
  }
  @media (max-width: 880px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
</style>
