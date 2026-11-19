<script lang="ts">
  import { onMount } from 'svelte';
  import { CORE_SIGNALS, DAY_TYPES, signalList } from '@mindwell/core';
  import type { IntentResult, PromptSlot } from '@mindwell/core';
  import {
    Page,
    Toolbar,
    Button,
    Kbd,
    Step,
    Choice,
    Scale,
    Field,
    Ornament,
    Epigraph,
    IconButton,
    PromptList,
    PromptCard,
    MarginNote,
    RatingDots,
    Tag
  } from '@mindwell/ui';
  import { TodayState } from '$lib/today.svelte';
  import type { ShownPrompt } from '$lib/today.svelte';
  import { dayRunningHead, eventLine, isEveningOpen, phaseLabel, todayPhase } from '$lib/today';
  import { moduleRunningHead } from '$lib/nav';
  import { activation } from '$lib/activation.svelte';
  import { capture } from '$lib/capture.svelte';

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
    exam: 'Exam or test',
    heavy_study: 'Heavy study',
    stressful_event: 'Stressful event',
    social: 'Social',
    light: 'Light day',
    busy_travel: 'Busy or travel'
  };
  const dayTypeOptions = DAY_TYPES.map((v) => ({ value: v, label: DAY_TYPE_LABELS[v] ?? v }));
  const RESULT_LABELS: Record<IntentResult, string> = { kept: 'Kept', partly: 'Partly', not: 'Not today' };
  const resultOptions = (Object.keys(RESULT_LABELS) as IntentResult[]).map((v) => ({ value: v, label: RESULT_LABELS[v] }));

  const eveningOpen = $derived(isEveningOpen(now, today.hasEveningData) || today.eveningRevealed);
  const phase = $derived(
    todayPhase({ morningStage: today.morningStage, morningEditing: today.morningEditing, eveningOpen })
  );
  const morningIntent = $derived(today.intentPrompt('morning'));
  const morningJournal = $derived(today.journalPrompts('morning'));
  const eveningReflection = $derived(today.journalPrompts('evening')[0] ?? null);
  const hasIntentText = $derived(!!today.dayRow?.intent_text);
  const canCapture = $derived(activation.active.some((m) => m.manifest.id === 'ch01'));
  const comingUp = $derived(
    signalList(today.signals, CORE_SIGNALS.upcomingEvents)
      .map(eventLine)
      .filter((l): l is string => l !== null)
  );
  // "Coming up" sits between module margin notes ordered before and after it.
  const COMING_UP_ORDER = 30;

  /** "Chapter 1 · Notice and name" for a prompt's module; nothing for core prompts. */
  function sourceOf(module: string): string | undefined {
    const m = activation.active.find((x) => x.manifest.id === module);
    if (!m) return undefined;
    const h = moduleRunningHead(m.manifest);
    return `${h.head} · ${h.sub}`;
  }

  /** Once prompts are chosen, day type and energy save as they change. */
  function autosaveBasics() {
    if (today.morningStage === 'prompts' && today.energy !== null) void today.saveMorningBasics();
  }

  function onIntentKey(e: KeyboardEvent) {
    if (e.key === 'Enter') void today.saveIntent();
  }
</script>

{#snippet cards(slot: 'morning' | 'anytime' | 'evening' | 'margin', range: 'all' | 'before' | 'after' = 'all')}
  {#if today.store}
    {#each today.cards(slot).filter((c) => range === 'all' || (range === 'before') === c.order < COMING_UP_ORDER) as card (card.key)}
      {@const C = card.component}
      <C store={today.store} day={today.day} signals={today.signals} />
    {/each}
  {/if}
{/snippet}

{#snippet journal(slot: PromptSlot, prompts: ShownPrompt[])}
  <PromptList>
    {#each prompts as p, i (p.promptId)}
      <PromptCard
        n={i + 1}
        text={p.text}
        source={sourceOf(p.module)}
        feedback={p.feedback}
        onfeedback={(f) => void today.rate(slot, p.promptId, f)}
        onanother={() => void today.another(slot, p.promptId)}
      >
        {#snippet note()}
          {#if today.noOther[p.promptId]}<p class="src">No other prompt fits today.</p>{/if}
        {/snippet}
      </PromptCard>
    {/each}
  </PromptList>
{/snippet}

{#snippet intention(n: string)}
  <Step {n} title="Today's intention">
    {#if morningIntent}
      {@const p = morningIntent}
      <Epigraph text={p.text}>
        {#snippet source()}
          <div class="src-row">
            <span>
              {sourceOf(p.module) ?? ''}{#if today.noOther[p.promptId]}{sourceOf(p.module) ? ' · ' : ''}No other prompt fits today.{/if}
            </span>
            <span class="acts">
              <IconButton icon="check" label="Useful" pressed={p.feedback === 'useful'} onclick={() => void today.rate('morning', p.promptId, 'useful')} />
              <IconButton icon="cross" label="Not useful" pressed={p.feedback === 'not-useful'} onclick={() => void today.rate('morning', p.promptId, 'not-useful')} />
              <IconButton icon="another" label="Show another" onclick={() => void today.another('morning', p.promptId)} />
            </span>
          </div>
        {/snippet}
      </Epigraph>
    {/if}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="intent" onkeydown={onIntentKey} onfocusout={() => void today.saveIntent()}>
      <Field variant="line" label="My intention" hint="You'll see this again at the evening close." bind:value={today.intentText} />
    </div>
  </Step>
{/snippet}

{#snippet foot(text: string, actions: import('svelte').Snippet)}
  <div class="foot"><span>{text}</span><div class="foot-actions">{@render actions()}</div></div>
{/snippet}

{#snippet marginNotes()}
  {@const y = today.yesterday}
  <MarginNote label="Yesterday">
    {#if y && (y.rating !== null || y.intent_text)}
      {#if y.rating !== null}<RatingDots value={y.rating} />{/if}
      {#if y.intent_text}<p>{y.intent_text}</p>{/if}
      {#if y.intent_result}<p class="meta"><Tag>{RESULT_LABELS[y.intent_result]}</Tag></p>{/if}
    {:else}
      <p class="meta">Nothing recorded yesterday.</p>
    {/if}
  </MarginNote>
  {@render cards('margin', 'before')}
  {#if comingUp.length > 0}
    <MarginNote label="Coming up">
      {#each comingUp as line (line)}<p>{line}</p>{/each}
    </MarginNote>
  {/if}
  {@render cards('margin', 'after')}
{/snippet}

{#snippet beginActions()}
  <Button disabled={today.busy} onclick={() => void today.doneMorning()}>Begin the day</Button>
{/snippet}

{#snippet continueActions()}
  {#if today.morningEditing}
    <Button variant="quiet" onclick={() => (today.morningEditing = false)}>Cancel</Button>
  {/if}
  <Button disabled={today.energy === null || today.busy} onclick={() => void today.saveMorningBasics()}>Continue</Button>
{/snippet}

{#snippet dayActions()}
  <Button variant="quiet" onclick={() => (today.morningEditing = true)}>Edit the morning</Button>
  <Button variant="secondary" onclick={() => (today.eveningRevealed = true)}>Close now</Button>
{/snippet}

{#snippet eveningActions()}
  {#if today.eveningEditing}
    <Button variant="quiet" onclick={() => (today.eveningEditing = false)}>Cancel</Button>
  {/if}
  <Button disabled={today.busy} onclick={() => void today.saveEveningBasics()}>Continue</Button>
{/snippet}

{#snippet closeActions()}
  <Button variant="quiet" onclick={() => (today.eveningEditing = true)}>Edit</Button>
  <Button disabled={today.busy} onclick={() => void today.closeDay()}>Close the day</Button>
{/snippet}

{#snippet closedActions()}
  <Button variant="quiet" onclick={() => (today.eveningEditing = true)}>Edit</Button>
{/snippet}

<Toolbar head={dayRunningHead(today.day)} sub={phaseLabel(phase)}>
  {#snippet actions()}
    {#if canCapture}
      <Button variant="secondary" icon="plus" href="/m/ch01/capture">Capture a thought<Kbd keys={capture.shortcut} /></Button>
    {/if}
  {/snippet}
</Toolbar>

{#if phase === 'morning'}
  <Page
    label="Morning check-in"
    title="Good morning."
    lede="Two minutes to read the day ahead, set one intention, and choose what to write about."
    margin={today.store ? marginNotes : undefined}
  >
    {#if today.error}<p class="error" role="alert">{today.error}</p>{/if}
    {#if today.store}
      <Step n="i." title="What kind of day is it?" id="step-types">
        <Choice
          label="What kind of day is it?"
          labelledby="step-types"
          options={dayTypeOptions}
          multiple
          bind:value={
            () => today.types,
            (v) => {
              today.types = Array.isArray(v) ? v : [];
              autosaveBasics();
            }
          }
        />
      </Step>
      <Step n="ii." title="How much energy do you have?" id="step-energy">
        <Scale
          label="Energy"
          labelledby="step-energy"
          mode="1-5"
          minLabel="running on empty"
          maxLabel="fully charged"
          bind:value={
            () => today.energy,
            (v) => {
              today.energy = v;
              autosaveBasics();
            }
          }
        />
      </Step>
      {@render cards('morning')}

      {#if today.morningStage === 'prompts'}
        <Ornament />
        {@render intention('iii.')}
        {#if morningJournal.length > 0}
          <Step n="iv." title="For your journal">{@render journal('morning', morningJournal)}</Step>
        {/if}
        {@render foot('Saved as you go.', beginActions)}
      {:else}
        {@render foot(
          today.energy === null ? 'Choose your energy to continue.' : 'Next: one intention, and what to write about.',
          continueActions
        )}
      {/if}
    {/if}
  </Page>
{:else if phase === 'day'}
  <Page
    label="Today"
    title="Your day."
    lede="Your intention and what to write about. Close the day here this evening."
    margin={today.store ? marginNotes : undefined}
  >
    {#if today.error}<p class="error" role="alert">{today.error}</p>{/if}
    {@render intention('i.')}
    {#if morningJournal.length > 0}
      <Step n="ii." title="For your journal">{@render journal('morning', morningJournal)}</Step>
    {/if}
    {@render cards('anytime')}
    {@render foot('Close the day here this evening.', dayActions)}
  </Page>
{:else}
  <Page
    label="Evening close"
    title="Good evening."
    lede="A minute to look back at the day, then close it."
    margin={today.store ? marginNotes : undefined}
  >
    {#if today.error}<p class="error" role="alert">{today.error}</p>{/if}
    {#if today.store}
      {#if today.eveningStage === 'basics'}
        <Step n="i." title={hasIntentText ? 'Did you keep your intention?' : 'Your intention'} id="step-kept">
          {#if hasIntentText}
            <Epigraph text={today.dayRow?.intent_text ?? ''} />
            <Choice
              label="Did you keep it?"
              labelledby="step-kept"
              options={resultOptions}
              bind:value={
                () => today.intentResult,
                (v) => (today.intentResult = v === 'kept' || v === 'partly' || v === 'not' ? v : null)
              }
            />
          {:else}
            <p class="note">No intention set this morning.</p>
          {/if}
        </Step>
        <Step n="ii." title="How was the day?" id="step-rating">
          <Scale label="How was the day?" labelledby="step-rating" mode="1-5" minLabel="a hard day" maxLabel="a good day" bind:value={today.rating} />
        </Step>
        {@render cards('evening')}
        {@render foot('Next: one thing to write about tonight.', eveningActions)}
      {:else}
        {@render cards('evening')}
        {#if eveningReflection}
          <Step n="iii." title="For your journal tonight">{@render journal('evening', [eveningReflection])}</Step>
        {/if}
        {#if today.eveningStage === 'finish'}
          {@render foot('Saved as you go.', closeActions)}
        {:else}
          {@render foot(
            `Day closed.${today.dayRow?.intent_result ? ` Intention: ${RESULT_LABELS[today.dayRow.intent_result].toLowerCase()}.` : ''} ${today.dayRow?.rating ? `Rated ${today.dayRow.rating} of 5.` : 'Not rated.'}`,
            closedActions
          )}
        {/if}
      {/if}
    {/if}
  </Page>
{/if}

<style>
  .intent {
    margin-top: 28px;
  }
  .src-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  /* 44px buttons that take up one 12.5px/1.5 text line (18.75px), so the row is as tall as the mockup's source line. */
  .src-row {
    min-height: 18.75px;
  }
  .src-row .acts {
    display: flex;
    gap: 2px;
    margin: -12.625px 0;
  }
  .src {
    font-size: 12.5px;
    color: var(--muted);
    margin: 10px 0 0;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    gap: 16px;
  }
  .foot span {
    font-size: 13px;
    color: var(--muted);
  }
  .foot-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .note,
  .error {
    font-size: 14px;
    color: var(--muted);
    margin: 16px 0 0;
  }
  .error {
    margin: 0 0 24px;
  }
</style>
