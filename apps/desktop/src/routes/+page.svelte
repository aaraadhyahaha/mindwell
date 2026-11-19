<script lang="ts">
  import { onMount } from 'svelte';
  import { DAY_TYPES } from '@mindwell/core';
  import type { PromptSlot } from '@mindwell/core';
  import { Page, SectionLabel, Card, PromptCard, Field, Scale, Choice, Button } from '@mindwell/ui';
  import { TodayState } from '$lib/today.svelte';
  import type { ShownPrompt } from '$lib/today.svelte';
  import { dayHeading, intentResultLabel, isEveningOpen } from '$lib/today';

  const today = new TodayState();
  let now = $state(new Date());

  onMount(() => {
    void today.load();
    const tick = () => {
      now = new Date();
      void today.rollover(now);
    };
    const timer = setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  });

  const DAY_TYPE_LABELS: Record<string, string> = {
    exam: 'Exam',
    heavy_study: 'Heavy study',
    stressful_event: 'Stressful event',
    social: 'Social',
    light: 'Light',
    busy_travel: 'Busy or travelling'
  };
  const dayTypeOptions = DAY_TYPES.map((v) => ({ value: v, label: DAY_TYPE_LABELS[v] ?? v }));
  const resultOptions = [
    { value: 'kept', label: 'Kept' },
    { value: 'partly', label: 'Partly' },
    { value: 'not', label: 'Not today' }
  ];

  const eveningOpen = $derived(isEveningOpen(now, today.hasEveningData) || today.eveningRevealed);
  const morningIntent = $derived(today.intentPrompt('morning'));
  const morningJournal = $derived(today.journalPrompts('morning'));
  const eveningReflection = $derived(today.journalPrompts('evening')[0] ?? null);
  const hasIntentText = $derived(!!today.dayRow?.intent_text);

  function onIntentKey(e: KeyboardEvent) {
    if (e.key === 'Enter') void today.saveIntent();
  }
</script>

{#snippet prompt(slot: PromptSlot, p: ShownPrompt)}
  <PromptCard
    text={p.text}
    feedback={p.feedback}
    onfeedback={(f) => void today.rate(slot, p.promptId, f)}
    onanother={() => void today.another(slot, p.promptId)}
  />
  {#if today.noOther[p.promptId]}<p class="note">No other prompt fits today.</p>{/if}
{/snippet}

{#snippet cards(slot: 'morning' | 'anytime' | 'evening')}
  {#if today.store}
    {#each today.cards(slot) as card (card.key)}
      {@const C = card.component}
      <C store={today.store} day={today.day} signals={today.signals} />
    {/each}
  {/if}
{/snippet}

<Page label={dayHeading(today.day)} title="Today">
  {#if today.error}<p class="note" role="alert">{today.error}</p>{/if}

  {#if today.store}
    <section aria-labelledby="slot-morning">
      <SectionLabel as="h2"><span id="slot-morning">Morning</span></SectionLabel>

      {#if today.morningStage === 'basics'}
        <div class="stack">
          <Choice
            label="What kind of day is it?"
            options={dayTypeOptions}
            multiple
            bind:value={() => today.types, (v) => (today.types = Array.isArray(v) ? v : [])}
          />
          <Scale label="Energy" mode="1-5" minLabel="Low" maxLabel="High" bind:value={today.energy} />
          {#if today.energy === null}<p class="muted">Choose your energy to continue.</p>{/if}
          <div class="row">
            <Button disabled={today.energy === null} onclick={() => void today.saveMorningBasics()}>Continue</Button>
            {#if today.morningEditing}
              <Button variant="quiet" onclick={() => (today.morningEditing = false)}>Cancel</Button>
            {/if}
          </div>
        </div>
      {:else if today.morningStage === 'prompts'}
        <div class="stack">
          <div class="context">
            {#each today.context as line (line)}<p>{line}</p>{/each}
          </div>
          {#if morningIntent}{@render prompt('morning', morningIntent)}{/if}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div onkeydown={onIntentKey} onfocusout={() => void today.saveIntent()}>
            <Field label="Your intent for today" bind:value={today.intentText} />
          </div>
          {#if morningJournal.length > 0}
            <p class="muted">Write in your journal, then mark what helped.</p>
            {#each morningJournal as p (p.promptId)}{@render prompt('morning', p)}{/each}
          {/if}
          <div class="row">
            <Button onclick={() => void today.doneMorning()}>Done</Button>
            <Button variant="quiet" onclick={() => (today.morningEditing = true)}>Edit</Button>
          </div>
        </div>
      {:else}
        <div class="stack">
          {#if today.dayRow?.intent_text}<p class="intent">{today.dayRow.intent_text}</p>{/if}
          {#each morningJournal as p (p.promptId)}{@render prompt('morning', p)}{/each}
          <div class="row"><Button variant="quiet" onclick={() => (today.morningEditing = true)}>Edit</Button></div>
        </div>
      {/if}
      {@render cards('morning')}
    </section>

    <section aria-labelledby="slot-anytime">
      <SectionLabel as="h2"><span id="slot-anytime">Anytime</span></SectionLabel>
      {#if today.cards('anytime').length === 0}
        <p class="muted">Cards from chapters you've read will appear here.</p>
      {:else}
        <div class="stack">{@render cards('anytime')}</div>
      {/if}
    </section>

    <section aria-labelledby="slot-evening">
      <SectionLabel as="h2"><span id="slot-evening">Evening</span></SectionLabel>

      {#if !eveningOpen}
        <div class="row">
          <p class="muted">Close the day here this evening.</p>
          <Button variant="quiet" onclick={() => (today.eveningRevealed = true)}>Close now</Button>
        </div>
      {:else}
        <div class="stack">
          {#if today.eveningStage === 'basics'}
            {#if hasIntentText}
              <p class="intent">{today.dayRow?.intent_text}</p>
              <Choice
                label="Did you keep it?"
                options={resultOptions}
                bind:value={() => today.intentResult, (v) => (today.intentResult = v === 'kept' || v === 'partly' || v === 'not' ? v : null)}
              />
            {:else}
              <p class="muted">No intent set this morning.</p>
            {/if}
          {/if}
          {@render cards('evening')}
          {#if today.eveningStage === 'basics'}
            <Scale label="How was the day?" mode="1-5" bind:value={today.rating} />
            <div class="row">
              <Button onclick={() => void today.saveEveningBasics()}>Continue</Button>
              {#if today.eveningEditing}
                <Button variant="quiet" onclick={() => (today.eveningEditing = false)}>Cancel</Button>
              {/if}
            </div>
          {:else if today.eveningStage === 'finish'}
            {#if eveningReflection}{@render prompt('evening', eveningReflection)}{/if}
            <div class="row">
              <Button onclick={() => void today.closeDay()}>Close the day</Button>
              <Button variant="quiet" onclick={() => (today.eveningEditing = true)}>Edit</Button>
            </div>
          {:else}
            <p class="muted">
              Closed.{#if today.dayRow?.intent_result}
                Intent: {intentResultLabel(today.dayRow.intent_result)} ·{/if}
              Day: {today.dayRow?.rating ?? 'not rated'}{today.dayRow?.rating ? ' of 5' : ''}
            </p>
            {#if eveningReflection}{@render prompt('evening', eveningReflection)}{/if}
            <div class="row"><Button variant="quiet" onclick={() => (today.eveningEditing = true)}>Edit</Button></div>
          {/if}
        </div>
      {/if}
    </section>
  {/if}
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
    gap: var(--space-4);
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  .muted,
  .note,
  .context {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  .context {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .intent {
    font-family: var(--font-serif);
    font-size: var(--text-19);
    line-height: var(--leading-body);
  }
</style>
