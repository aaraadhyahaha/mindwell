<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import type { ModuleViewProps } from '@mindwell/core';
  import { signalString } from '@mindwell/core';
  import { Button, Choice, Field, Kbd, MarginNote, Meter, Page, Scale, Step, Tag } from '@mindwell/ui';
  import {
    STEPS,
    THREE_PS,
    changedFields,
    coachLine,
    emptyFields,
    fieldsOf,
    findCapture,
    hasContent,
    missingForComplete,
    startParams,
    stepFilled,
    type FormFields,
    type PsKey,
  } from '../form';
  import { getRecord, saveDraft, startRecord } from '../repo';
  import type { ThoughtRecord } from '../schema';
  import { storyNames } from '../signals';

  let { store, day, signals }: ModuleViewProps = $props();

  let record = $state<ThoughtRecord | null>(null);
  let fields = $state<FormFields>(emptyFields());
  /** What the store holds; autosave writes the difference. */
  let saved: FormFields = emptyFields();
  let ready = $state(false);
  let current = $state(0);
  let finished = $state(false);
  let error = $state<string | null>(null);
  let stepEl = $state<HTMLElement | null>(null);

  const step = $derived(STEPS[current]!);
  const name = $derived(signalString(signals, 'user.name'));
  const storyName = $derived(record?.story_id ? (storyNames(signals).get(record.story_id) ?? null) : null);
  const missing = $derived(missingForComplete(fields));

  // ---- Load: resume `?id=`, start from `?capture=`, or wait for the first keystroke ----
  async function init() {
    const { id, capture } = startParams(window.location.search);
    let r: ThoughtRecord | null = null;
    if (id) r = await getRecord(store, id);
    if (!r) {
      const cap = findCapture(signals, capture);
      if (cap) r = await startRecord(store, { day, capture: cap });
    }
    if (r) {
      record = r;
      fields = fieldsOf(r);
      saved = fieldsOf(r);
      // A resumed draft opens at its first empty step.
      if (id) current = Math.max(0, STEPS.findIndex((s) => !stepFilled(s.key, fields)));
    }
    ready = true;
    await focusStep();
  }
  void init().catch(() => {
    error = 'This thought record could not be opened.';
    ready = true;
  });

  // ---- Autosave: debounced, serialised, only changed fields ----
  let queue: Promise<void> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function flush(): Promise<void> {
    clearTimeout(timer);
    queue = queue.then(async () => {
      const now = $state.snapshot(fields) as FormFields;
      const diff = changedFields(saved, now);
      if (Object.keys(diff).length === 0) return;
      try {
        if (!record) {
          if (!hasContent(now)) return;
          record = await startRecord(store, { day });
        }
        record = await saveDraft(store, record.id, diff);
        saved = now;
        error = null;
      } catch (e) {
        error = e instanceof Error ? e.message : 'Could not save. Your text is still here.';
      }
    });
    return queue;
  }

  $effect(() => {
    void JSON.stringify(fields);
    if (!ready) return;
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), 500);
  });

  onDestroy(() => void flush());

  // ---- Steps ----
  async function focusStep() {
    await tick();
    stepEl?.querySelector<HTMLElement>('textarea, input, button')?.focus();
  }

  async function go(i: number) {
    void flush();
    finished = false;
    current = Math.min(STEPS.length - 1, Math.max(0, i));
    await focusStep();
  }

  async function next() {
    if (current < STEPS.length - 1) return go(current + 1);
    await flush();
    finished = true;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter' || e.shiftKey || e.altKey) return;
    const t = e.target as HTMLElement;
    const lineInput = t instanceof HTMLInputElement && t.type === 'text';
    if (e.ctrlKey || e.metaKey || lineInput) {
      e.preventDefault();
      void next();
    }
  }

  // Three Ps: the Choice holds the toggled keys; the record holds 0/1 per key.
  const psSelected = () => THREE_PS.filter((p) => fields[p.key] === 1).map((p) => p.key as string);
  function psSet(v: string | string[] | null) {
    const on = new Set(Array.isArray(v) ? v : v ? [v] : []);
    for (const p of THREE_PS) fields[p.key as PsKey] = on.has(p.key) ? 1 : 0;
  }
  const psOn = $derived(THREE_PS.filter((p) => fields[p.key] === 1));
</script>

{#snippet thoughtQuote()}
  {#if fields.automatic_thought.trim()}
    <blockquote class="quote"><p>{fields.automatic_thought}</p></blockquote>
  {/if}
{/snippet}

<Page label="Chapter 2" title="A thought record" lede="Check the thought like a fair judge: accurate, not merely positive.">
  {#if ready}
    {#if finished}
      <div class="done" bind:this={stepEl}>
        <p class="label">{missing.length ? 'Saved as a draft' : 'Saved'}</p>
        {#if fields.intensity_before !== null && fields.intensity_after !== null}
          <p class="change" aria-label="Intensity {fields.intensity_before} before, {fields.intensity_after} now">
            <span class="big">{fields.intensity_before}</span><span class="arrow" aria-hidden="true">→</span><span class="big">{fields.intensity_after}</span>
          </p>
          <p class="meta">{fields.feeling.trim() || 'Intensity'}, before and after</p>
        {/if}
        {#if missing.length}
          <p class="missing">
            To count as complete it still needs
            {#each missing as m, i (m.key)}{i > 0 ? (i === missing.length - 1 ? ' and ' : ', ') : ''}<button
                type="button"
                class="link"
                onclick={() => go(STEPS.indexOf(m))}><i>{m.n}</i> {m.short.toLowerCase()}</button
              >{/each}.
          </p>
        {:else if fields.balanced_thought.trim()}
          <blockquote class="quote"><p>{fields.balanced_thought}</p></blockquote>
        {/if}
        <div class="foot">
          <Button variant="quiet" onclick={() => go(STEPS.length - 1)}>Back</Button>
          <span class="acts">
            <Button variant="secondary" href="/">Back to Today</Button>
            <Button href="/m/ch02">See your records</Button>
          </span>
        </div>
      </div>
    {:else}
      <div class="where">
        <span class="label">Step {current + 1} of {STEPS.length}</span>
        {#if error}<span class="error" role="alert">{error}</span>{/if}
      </div>
      <Meter fraction={(current + 1) / STEPS.length} />

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="body" bind:this={stepEl} {onkeydown}>
        <Step n={step.n} title={step.title} id="ch02-step-title">
          {#if step.key === 'situation'}
            <div class="gap">
              <Field
                label="Situation"
                multiline
                rows={3}
                bind:value={fields.situation}
                placeholder="Where were you, who was there, what had just happened?"
                hint="The facts a camera would have caught."
              />
            </div>
          {:else if step.key === 'thought'}
            <div class="gap-line"><Field
              label="The thought"
              variant="line"
              bind:value={fields.automatic_thought}
              placeholder="I'm going to fail this."
              hint="Exactly as it showed up, not tidied."
            /></div>
            {#if record?.capture_id}
              <p class="from">From your capture{#if storyName}<span class="sep">·</span><Tag>{storyName}</Tag>{/if}</p>
            {/if}
          {:else if step.key === 'feeling'}
            <div class="gap-line"><Field label="Feeling" variant="line" bind:value={fields.feeling} placeholder="anxious, ashamed, angry…" hint="One word is enough." /></div>
            <div class="gap-lg">
              <Scale label="Intensity" mode="0-100" bind:value={fields.intensity_before} minLabel="barely there" maxLabel="as strong as it gets" />
            </div>
          {:else if step.key === 'evidence_for'}
            {@render thoughtQuote()}
            <div class="gap">
              <Field
                label="What supports it"
                multiline
                rows={4}
                bind:value={fields.evidence_for}
                hint="Facts that would hold up in front of a judge, not feelings."
              />
            </div>
          {:else if step.key === 'evidence_against'}
            {@render thoughtQuote()}
            <p class="helper">What would you tell a friend who thought this?</p>
            <div class="gap">
              <Field
                label="What doesn't fit"
                multiline
                rows={4}
                bind:value={fields.evidence_against}
                hint="Times it wasn't true, things you're leaving out, other explanations."
              />
            </div>
          {:else if step.key === 'three_ps'}
            {@render thoughtQuote()}
            <Choice label="The explanation is" labelledby="ch02-step-title" multiple options={THREE_PS.map((p) => ({ value: p.key, label: p.label }))} bind:value={psSelected, psSet} />
            {#if psOn.length}
              <ul class="hints">
                {#each psOn as p (p.key)}
                  <li><span class="label">{p.label}</span><p>{p.hint}</p></li>
                {/each}
              </ul>
            {:else}
              <ul class="hints quiet">
                {#each THREE_PS as p (p.key)}
                  <li><span class="label">{p.label}</span><p>{p.question}</p></li>
                {/each}
              </ul>
            {/if}
          {:else if step.key === 'balanced'}
            <p class="coach">{coachLine(name)}</p>
            <div class="gap">
              <Field
                label="Balanced thought"
                multiline
                rows={3}
                bind:value={fields.balanced_thought}
                hint="It has to be something you believe, not just something positive."
              />
            </div>
          {:else if step.key === 'after'}
            {#if fields.balanced_thought.trim()}<blockquote class="quote"><p>{fields.balanced_thought}</p></blockquote>{/if}
            <div class="gap-lg">
              <Scale
                label="Intensity now{fields.feeling.trim() ? `: ${fields.feeling.trim()}` : ''}"
                mode="0-100"
                bind:value={fields.intensity_after}
                minLabel="barely there"
                maxLabel="as strong as it gets"
              />
            </div>
            {#if fields.intensity_before !== null}
              <p class="meta before">Before, it was {fields.intensity_before}.</p>
            {/if}
          {/if}
        </Step>

        <div class="foot">
          <span class="note">Saved as you go<span class="sep">·</span><Kbd keys="Ctrl+Enter" />&nbsp;next</span>
          <span class="acts">
            {#if current > 0}<Button variant="quiet" onclick={() => go(current - 1)}>Back</Button>{/if}
            <Button onclick={next}>{current === STEPS.length - 1 ? 'Finish' : 'Next'}</Button>
          </span>
        </div>
      </div>
    {/if}
  {/if}

  {#snippet margin()}
    <MarginNote label="The thought">
      {#if fields.automatic_thought.trim()}
        <p>{fields.automatic_thought}</p>
        {#if storyName}<p class="meta"><Tag>{storyName}</Tag></p>{/if}
      {:else}
        <p class="meta">Not written yet.</p>
      {/if}
    </MarginNote>
    {#if fields.feeling.trim() || fields.intensity_before !== null}
      <MarginNote label="Feeling">
        <p>{fields.feeling.trim() || 'Intensity'}{#if fields.intensity_before !== null}<span class="sep">·</span>{fields.intensity_before}{#if fields.intensity_after !== null}{' → '}{fields.intensity_after}{/if}{/if}</p>
      </MarginNote>
    {/if}
    <MarginNote label="Steps">
      <ol class="toc">
        {#each STEPS as s, i (s.key)}
          <li>
            <button
              type="button"
              class:on={!finished && i === current}
              class:filled={stepFilled(s.key, fields)}
              aria-current={!finished && i === current ? 'step' : undefined}
              onclick={() => go(i)}><i>{s.n}</i>{s.short}</button
            >
          </li>
        {/each}
      </ol>
    </MarginNote>
  {/snippet}
</Page>

<style>
  .label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 0;
  }
  .where {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 10px;
  }
  .error {
    font-size: 12.5px;
    color: var(--accent);
  }
  .body {
    margin-top: 40px;
  }
  .gap {
    margin-top: 20px;
  }
  .gap-line {
    margin-top: 28px;
  }
  .gap-lg {
    margin-top: 32px;
  }
  .quote {
    margin: 18px 0 0;
    padding: 2px 0 2px 18px;
    border-left: 2px solid var(--accent);
  }
  .quote p {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.45;
    margin: 0;
  }
  .helper,
  .coach {
    font-family: var(--font-serif);
    font-style: italic;
    margin: 22px 0 0;
  }
  .helper {
    font-size: 17px;
    color: var(--muted);
  }
  .coach {
    font-size: 23px;
    line-height: 1.42;
    color: var(--ink);
  }
  .from {
    display: flex;
    align-items: center;
    gap: 0;
    font-size: 12.5px;
    color: var(--muted);
    margin: 12px 0 0;
  }
  .sep {
    margin: 0 8px;
    color: var(--muted);
  }
  .hints {
    list-style: none;
    margin: 24px 0 0;
    padding: 0;
    border-top: 1px solid var(--rule);
  }
  .hints li {
    display: grid;
    grid-template-columns: 112px 1fr;
    gap: 12px;
    align-items: baseline;
    padding: 14px 0;
    border-bottom: 1px solid var(--rule);
  }
  .hints p {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.45;
    margin: 0;
  }
  .hints .label {
    color: var(--accent);
  }
  .hints.quiet p {
    color: var(--muted);
    font-style: italic;
  }
  .hints.quiet .label {
    color: var(--muted);
  }
  .meta {
    font-size: 12.5px;
    color: var(--muted);
  }
  .before {
    margin: 14px 0 0;
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 15px;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-top: 8px;
  }
  .note {
    font-size: 13px;
    color: var(--muted);
    display: inline-flex;
    align-items: center;
  }
  .acts {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  /* Finished view */
  .done .change {
    display: flex;
    align-items: baseline;
    gap: 18px;
    margin: 18px 0 0;
  }
  .big {
    font-family: var(--font-serif);
    font-size: 42px;
    line-height: 1.12;
    color: var(--accent);
  }
  .arrow {
    font-family: var(--font-serif);
    font-size: 24px;
    color: var(--muted);
  }
  .done .meta {
    margin: 4px 0 0;
  }
  .missing {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.45;
    margin: 22px 0 0;
  }
  .link {
    font: 600 15px var(--font-sans);
    color: var(--accent);
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    min-height: 24px;
  }
  .link i {
    font-family: var(--font-serif);
    font-weight: 400;
  }
  .done .foot {
    margin-top: 44px;
  }
  /* Margin step list (the sidebar's table-of-contents shape) */
  .toc {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
  }
  .toc button {
    display: flex;
    gap: 10px;
    align-items: baseline;
    width: 100%;
    padding: 4px 0;
    min-height: 30px;
    background: none;
    border: 0;
    font: 500 13.5px var(--font-sans);
    color: var(--muted);
    text-align: left;
    cursor: pointer;
  }
  .toc button i {
    font-family: var(--font-serif);
    width: 30px;
    flex: none;
    color: var(--accent);
  }
  .toc button.filled {
    color: var(--ink);
  }
  .toc button.filled::after {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    margin-left: auto;
    align-self: center;
  }
  .toc button.on {
    color: var(--accent);
    font-weight: 600;
  }
  .toc button:hover {
    color: var(--accent);
  }
</style>
