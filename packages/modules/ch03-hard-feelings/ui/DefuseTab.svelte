<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { signalList } from '@mindwell/core';
  import { Button, Field } from '@mindwell/ui';
  import { addDefusion, listDefusions } from '../repo';
  import type { Defusion } from '../schema';
  import { dayLabel, defusedText } from '../view';

  let { store, day, signals }: ModuleViewProps = $props();
  const uid = $props.id();

  type Capture = { id: string; text: string; day: string };

  let defusions = $state<Defusion[]>([]);
  let loaded = $state(false);
  let thought = $state('');
  let result = $state<string | null>(null);
  let error = $state<string | null>(null);
  let preselected = false;

  const captures = $derived.by(() => {
    const out: Capture[] = [];
    for (const v of signalList(signals, 'ch01.captures_recent')) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const c = v as Record<string, unknown>;
        if (typeof c.id === 'string' && typeof c.text === 'string' && typeof c.day === 'string') {
          out.push({ id: c.id, text: c.text, day: c.day });
        }
      }
    }
    return out;
  });
  const hasCaptures = $derived(signals['ch01.captures_recent'] !== undefined && captures.length > 0);

  const groups = $derived.by(() => {
    const m = new Map<string, Defusion[]>();
    for (const d of defusions) m.set(d.day, [...(m.get(d.day) ?? []), d]);
    return [...m];
  });

  async function load() {
    defusions = await listDefusions(store);
    loaded = true;
  }

  $effect(() => {
    void load();
  });

  $effect(() => {
    if (preselected) return;
    const id = new URLSearchParams(window.location.search).get('capture');
    if (!id) return void (preselected = true);
    const hit = captures.find((c) => c.id === id);
    if (hit) {
      thought = hit.text;
      preselected = true;
    }
  });

  async function defuse(text: string, captureId: string | null) {
    error = null;
    if (!text.trim()) return void (error = 'Write the thought first.');
    try {
      const d = await addDefusion(store, { capture_id: captureId, thought_text: text, day });
      result = defusedText(d.thought_text);
      thought = '';
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not save that. Please try again.';
    }
  }
</script>

<div class="two">
  <section aria-labelledby="{uid}-new">
    <div class="colhead"><h2 id="{uid}-new">Defuse a thought</h2></div>
    <form
      class="add"
      onsubmit={(e) => {
        e.preventDefault();
        void defuse(thought, null);
      }}
    >
      <Field label="The thought" bind:value={thought} multiline rows={3} placeholder="I'm going to fail this" />
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <div class="formacts">
        <Button type="submit" variant="secondary">Defuse</Button>
      </div>
    </form>

    {#if result}
      <div class="result" aria-live="polite">
        <p class="big">{result}</p>
        <p class="note">Read it slowly. The thought is still there; you're a step back from it.</p>
      </div>
    {/if}

    {#if hasCaptures}
      <div class="colhead sub"><h2>From your captures</h2></div>
      {#each captures as c (c.id)}
        <div class="row">
          <div>
            <p class="t">{c.text}</p>
            <p class="meta">{dayLabel(c.day, day)}</p>
          </div>
          <span class="acts"><button class="link" type="button" onclick={() => defuse(c.text, c.id)}>Defuse</button></span>
        </div>
      {/each}
    {/if}
  </section>

  <section aria-labelledby="{uid}-hist">
    <div class="colhead"><h2 id="{uid}-hist">Defused</h2></div>
    {#if loaded && defusions.length === 0}
      <p class="empty">Thoughts you defuse show up here, worded as a thought rather than a fact.</p>
    {/if}
    {#each groups as [d, items] (d)}
      <p class="dayh">{dayLabel(d, day)}</p>
      {#each items as r (r.id)}
        <div class="row"><p class="t">{defusedText(r.thought_text)}</p></div>
      {/each}
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
  .colhead.sub {
    margin-top: 40px;
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
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid var(--rule);
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
  .acts {
    display: flex;
    gap: 16px;
  }
  .add {
    display: grid;
    gap: 16px;
    margin-top: 24px;
  }
  .dayh {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 26px 0 0;
  }
  .formacts {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .result {
    margin-top: 28px;
  }
  .big {
    font-family: var(--font-serif);
    font-size: 24px;
    line-height: 1.4;
    margin: 0;
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
