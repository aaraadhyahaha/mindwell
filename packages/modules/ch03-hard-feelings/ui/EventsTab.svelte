<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { addDays } from '@mindwell/core';
  import { Button, Choice, Field, RatingDots, Scale, Tag, appHref } from '@mindwell/ui';
  import { addEvent, deleteEvent, listEvents, rateEvent, updateEvent } from '../repo';
  import type { ReframeHelped, StressEvent } from '../schema';
  import { clock } from '../signals';
  import { REAPPRAISAL_BODY } from '../reminders';
  import { dayLabel, fromStartsAt, HELPED_LABELS, HELPED_OPTIONS, splitEvents, toStartsAt } from '../view';

  let { store, day }: ModuleViewProps = $props();
  const uid = $props.id();

  let events = $state<StressEvent[]>([]);
  let loaded = $state(false);
  let now = $state(new Date().toISOString());

  // Add / edit form
  let editing = $state<string | null>(null);
  let title = $state('');
  let date = $state('');
  let time = $state('09:00');
  let error = $state<string | null>(null);

  // Rating, one open at a time
  let rating = $state<string | null>(null);
  let outcome = $state<number | null>(null);
  let helped = $state<string | null>(null);

  async function load() {
    events = await listEvents(store);
    now = new Date().toISOString();
    loaded = true;
  }

  $effect(() => {
    date = addDays(day, 1);
    void load();
  });

  const split = $derived(splitEvents(events, now));
  const toRate = $derived(split.past.filter((e) => e.outcome_rating === null));
  const rated = $derived(split.past.filter((e) => e.outcome_rating !== null));

  function resetForm() {
    editing = null;
    title = '';
    date = addDays(day, 1);
    time = '09:00';
    error = null;
  }

  function edit(e: StressEvent) {
    const v = fromStartsAt(e.starts_at);
    editing = e.id;
    title = e.title;
    date = v.date;
    time = v.time;
    error = null;
  }

  async function save(ev: SubmitEvent) {
    ev.preventDefault();
    const starts_at = toStartsAt(date, time);
    if (!title.trim()) return void (error = 'Give the event a short name.');
    if (!starts_at) return void (error = 'Pick a date and a time.');
    if (Date.parse(starts_at) <= Date.now()) return void (error = 'That time has passed. Pick a time still ahead.');
    try {
      if (editing) await updateEvent(store, editing, { title, starts_at });
      else await addEvent(store, { title, starts_at });
      resetForm();
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not save that. Please try again.';
    }
  }

  async function remove(id: string) {
    await deleteEvent(store, id);
    if (editing === id) resetForm();
    await load();
  }

  function openRating(id: string) {
    rating = id;
    outcome = null;
    helped = null;
  }

  async function saveRating() {
    if (!rating || outcome === null || helped === null) return;
    await rateEvent(store, rating, { outcome_rating: outcome, reframe_helped: helped as ReframeHelped });
    rating = null;
    await load();
  }

  const when = (e: StressEvent) => `${dayLabel(e.day, day)} · ${clock(e.starts_at)}`;
</script>

<div class="two">
  <section aria-labelledby="{uid}-up">
    <div class="colhead"><h2 id="{uid}-up">Coming up</h2><span>{split.upcoming.length || ''}</span></div>
    {#if loaded && split.upcoming.length === 0}
      <p class="empty">Add an exam, a talk or a hard conversation. You'll get a reminder to reframe the nerves.</p>
    {/if}
    {#each split.upcoming as e (e.id)}
      <div class="row">
        <div>
          <p class="t">{e.title}</p>
          <p class="meta">{when(e)}</p>
        </div>
        <span class="acts">
          <button class="link" type="button" onclick={() => edit(e)}>Edit</button>
          <button class="link" type="button" onclick={() => remove(e.id)}>Remove</button>
        </span>
      </div>
    {/each}

    <form class="add" onsubmit={save} aria-labelledby="{uid}-form">
      <h3 id="{uid}-form">{editing ? 'Change the event' : 'Add an event'}</h3>
      <Field label="What is it" bind:value={title} placeholder="Statistics exam" />
      <div class="when">
        <label>
          <span>Date</span>
          <input type="date" bind:value={date} min={day} />
        </label>
        <label>
          <span>Time</span>
          <input type="time" bind:value={time} />
        </label>
      </div>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <div class="formacts">
        <Button type="submit" variant="secondary" icon={editing ? 'check' : 'plus'}>{editing ? 'Save changes' : 'Add event'}</Button>
        {#if editing}<button class="link" type="button" onclick={resetForm}>Cancel</button>{/if}
      </div>
      <p class="note">
        A notification comes the morning of and an hour before, while mindwell is open in a browser tab. It says:
        <i>{REAPPRAISAL_BODY}</i> Turn notifications on in <a href={appHref('/settings')}>Settings</a>.
      </p>
    </form>
  </section>

  <section aria-labelledby="{uid}-past">
    <div class="colhead"><h2 id="{uid}-past">How it went</h2><span>{rated.length ? `${rated.length} rated` : ''}</span></div>
    {#if loaded && split.past.length === 0}
      <p class="empty">After an event you rate how it went, and whether calling it excitement helped.</p>
    {/if}
    {#each toRate as e (e.id)}
      <div class="row open">
        <div class="grow">
          <p class="t">{e.title}</p>
          <p class="meta">{when(e)} · not rated yet</p>
          {#if rating === e.id}
            <div class="rate">
              <Scale label="How did it go?" mode="1-5" bind:value={outcome} minLabel="Badly" maxLabel="Well" />
              <Choice label="Did the reframe help?" options={HELPED_OPTIONS} bind:value={helped} />
              <div class="formacts">
                <Button variant="secondary" disabled={outcome === null || helped === null} onclick={saveRating}>Save</Button>
                <button class="link" type="button" onclick={() => (rating = null)}>Cancel</button>
              </div>
            </div>
          {/if}
        </div>
        {#if rating !== e.id}
          <span class="acts"><button class="link" type="button" onclick={() => openRating(e.id)}>Rate it</button></span>
        {/if}
      </div>
    {/each}
    {#each rated as e (e.id)}
      <div class="row">
        <div>
          <p class="t">{e.title}</p>
          <div class="meta line">
            <span>{when(e)}</span>
            <RatingDots value={e.outcome_rating ?? 0} />
            {#if e.reframe_helped}<Tag>{HELPED_LABELS[e.reframe_helped]}</Tag>{/if}
          </div>
        </div>
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
  .colhead span {
    font-size: 12.5px;
    color: var(--muted);
  }
  .empty {
    font-size: 13px;
    color: var(--muted);
    margin: 14px 0 0;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid var(--rule);
  }
  .row.open {
    align-items: start;
  }
  .grow {
    min-width: 0;
  }
  .t {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.45;
    margin: 0;
  }
  .meta {
    font-size: 12.5px;
    color: var(--muted);
    margin: 4px 0 0;
  }
  .meta.line {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .acts {
    display: flex;
    gap: 16px;
  }
  .rate {
    display: grid;
    gap: 18px;
    margin-top: 16px;
  }
  .add {
    display: grid;
    gap: 16px;
    margin-top: 32px;
  }
  .add h3 {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 0;
  }
  .when {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .when label {
    display: grid;
    gap: 6px;
  }
  .when label span {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }
  .when input {
    font: 15px var(--font-sans);
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 9px;
    padding: 9px 12px;
    min-height: 44px;
    color-scheme: light dark;
  }
  .when input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .formacts {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .error {
    font-size: 13px;
    color: var(--ink);
    margin: 0;
  }
  .note {
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--muted);
    margin: 0;
  }
  .note i {
    font-family: var(--font-serif);
    font-size: 14px;
    color: var(--ink);
  }
  .note a,
  .link {
    font: 600 12.5px var(--font-sans);
    color: var(--accent);
    text-decoration: none;
  }
  .link {
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    min-height: 24px;
  }
  .note a:hover,
  .link:hover {
    text-decoration: underline;
  }
  @media (max-width: 880px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
</style>
