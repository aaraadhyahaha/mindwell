<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Button, Choice, Field, Meter, Scale } from '@mindwell/ui';
  import {
    activeSeries,
    finishSeries,
    finishSession,
    listSeries,
    sessionsForSeries,
    startSeries,
    startSession,
    stopSeries,
  } from '../repo';
  import { SERIES_PROMPTS, SESSION_MINUTES, validateTopic, type Series, type Session } from '../schema';
  import { dayLabel } from '../view';
  import { elapsedMinutes, formatClock, nextDay, remainingMs, seriesStep } from '../writing';

  let { store, day }: ModuleViewProps = $props();
  const uid = $props.id();

  const STATUS = { active: 'In progress', finished: 'Finished', stopped: 'Stopped' } as const;
  const DAY_OPTIONS = [
    { value: '3', label: '3 days' },
    { value: '4', label: '4 days' },
  ];

  let active = $state<Series | null>(null);
  let all = $state<Series[]>([]);
  let sessionsBy = $state<Record<string, Session[]>>({});
  let loaded = $state(false);
  let now = $state(Date.now());

  let topic = $state(
    typeof window === 'undefined' ? '' : (new URLSearchParams(window.location.search).get('topic') ?? '').slice(0, 60),
  );
  let days = $state<string | string[] | null>('3');
  let before = $state<number | null>(null);
  let after = $state<number | null>(null);

  const sessions = $derived(active ? (sessionsBy[active.id] ?? []) : []);
  const open = $derived(sessions.find((s) => s.mood_after === null) ?? null);
  const step = $derived.by(() => {
    const s = seriesStep(sessions, day);
    if (s === 'timer' && open && remainingMs(open.created_at, now) === 0) return 'mood_after';
    return s;
  });
  const n = $derived(active ? nextDay(sessions, active.planned_days) : 1);
  const left = $derived(open ? remainingMs(open.created_at, now) : 0);
  const finishedCount = $derived(sessions.filter((s) => s.mood_after !== null).length);

  async function load() {
    all = await listSeries(store);
    active = all.find((s) => s.status === 'active') ?? (await activeSeries(store));
    const map: Record<string, Session[]> = {};
    for (const s of all) map[s.id] = await sessionsForSeries(store, s.id);
    sessionsBy = map;
    loaded = true;
  }

  $effect(() => {
    void load();
  });

  $effect(() => {
    if (step !== 'timer') return;
    now = Date.now();
    const t = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(t);
  });

  async function start() {
    if (!validateTopic(topic)) return;
    await startSeries(store, { topic, planned_days: Number(days), start_day: day });
    topic = '';
    await load();
  }

  async function startTimer() {
    if (!active || before === null) return;
    await startSession(store, { series_id: active.id, day, mood_before: before, minutes: 0 });
    before = null;
    now = Date.now();
    await load();
  }

  async function save() {
    if (!active || !open || after === null) return;
    const minutes = elapsedMinutes(open.created_at, Date.now());
    await finishSession(store, open.id, { mood_after: after, minutes });
    if (finishedCount + 1 >= active.planned_days) await finishSeries(store, active.id);
    after = null;
    await load();
  }

  async function stop() {
    if (!active) return;
    await stopSeries(store, active.id);
    await load();
  }

  function finishEarly() {
    // Move the clock past the end so the screen shows "And now?"; minutes are measured at save.
    if (open) now = Math.max(now, Date.parse(open.created_at) + SESSION_MINUTES * 60_000);
  }

  function lines(id: string): Session[] {
    return (sessionsBy[id] ?? []).filter((s) => s.mood_after !== null);
  }
</script>

<div class="two">
  <section aria-labelledby="{uid}-now">
    {#if active}
      <div class="colhead"><h2 id="{uid}-now">{active.topic}</h2><span class="meta">Day {n} of {active.planned_days}</span></div>
      {#if step === 'done_today'}
        <p class="big">Today's session is done.</p>
        <p class="note">Day {n} tomorrow.</p>
      {:else}
        <p class="big">{SERIES_PROMPTS[n - 1]}</p>
        <p class="note">Write in your journal for 15 minutes without stopping. Don't worry about spelling or neatness.</p>
        {#if step === 'mood_before'}
          <div class="fade step">
            <Scale label="How do you feel right now?" mode="1-5" bind:value={before} minLabel="Low" maxLabel="Good" />
            <div class="formacts">
              <Button variant="secondary" disabled={before === null} onclick={startTimer}>Start 15-minute timer</Button>
            </div>
          </div>
        {:else if step === 'timer'}
          <div class="fade step">
            <p class="clock" role="timer" aria-label="Time left">{formatClock(left)}</p>
            <Meter fraction={1 - left / (SESSION_MINUTES * 60_000)} />
            <div class="formacts">
              <button class="link" type="button" onclick={finishEarly}>Finish early</button>
            </div>
          </div>
        {:else}
          <div class="fade step">
            <Scale label="And now?" mode="1-5" bind:value={after} minLabel="Low" maxLabel="Good" />
            <div class="formacts">
              <Button variant="secondary" disabled={after === null} onclick={save}>Save</Button>
            </div>
          </div>
        {/if}
      {/if}
      <div class="formacts">
        <button class="link" type="button" onclick={stop}>Stop this series</button>
      </div>
    {:else}
      <div class="colhead"><h2 id="{uid}-now">Start a writing series</h2></div>
      <div class="add">
        <Field
          label="Topic"
          bind:value={topic}
          hint="A short label. It can stay vague: 'the move', 'that week'."
        />
        <Choice label="How many days" options={DAY_OPTIONS} bind:value={days} />
        <div class="formacts">
          <Button variant="secondary" disabled={!validateTopic(topic)} onclick={start}>Start series</Button>
        </div>
        <p class="note">You write in your journal. Only the topic, your mood and the minutes are kept here.</p>
      </div>
    {/if}
  </section>

  <section aria-labelledby="{uid}-list">
    <div class="colhead"><h2 id="{uid}-list">Series</h2></div>
    {#if loaded && all.length === 0}
      <p class="empty">Writing series you start show up here, with how you felt before and after each day.</p>
    {/if}
    {#each all as s (s.id)}
      <div class="row">
        <p class="t">{s.topic}</p>
        <p class="meta">{STATUS[s.status]} · started {dayLabel(s.start_day, day)}</p>
        {#each lines(s.id) as x, i (x.id)}
          <p class="meta">Day {i + 1} · mood {x.mood_before} → {x.mood_after} · {x.minutes} min</p>
        {/each}
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
  .row .meta {
    display: block;
    margin: 4px 0 0;
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
  .add {
    display: grid;
    gap: 16px;
    margin-top: 32px;
  }
  .add .formacts {
    margin-top: 0;
  }
  .step {
    margin-top: 32px;
  }
  .clock {
    font-family: var(--font-serif);
    font-size: 56px;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    margin: 0 0 16px;
  }
  .fade {
    animation: fade 180ms ease-out;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .fade {
      animation: none;
    }
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
