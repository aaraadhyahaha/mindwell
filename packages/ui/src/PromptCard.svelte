<script lang="ts">
  import type { Snippet } from 'svelte';
  import IconButton from './IconButton.svelte';

  type Feedback = 'useful' | 'not-useful';
  /**
   * One journal prompt as a ruled row inside `PromptList`: serif numeral, 19px serif text,
   * its source under it, and Useful / Not useful / Show another as 44px icon buttons.
   */
  let {
    n,
    text,
    source,
    feedback = $bindable(null),
    onfeedback,
    onanother,
    note
  }: {
    n: number;
    text: string;
    source?: string;
    feedback?: Feedback | null;
    onfeedback?: (f: Feedback) => void;
    onanother?: () => void;
    /** Extra line under the source, e.g. "No other prompt fits today." */
    note?: Snippet;
  } = $props();

  function pick(f: Feedback) {
    feedback = f;
    onfeedback?.(f);
  }
</script>

<li>
  <span class="num">{n}</span>
  <div>
    <p class="ptext">{text}</p>
    {#if source}<p class="src">{source}</p>{/if}
    {@render note?.()}
  </div>
  <div class="acts">
    <IconButton icon="check" label="Useful" pressed={feedback === 'useful'} onclick={() => pick('useful')} />
    <IconButton icon="cross" label="Not useful" pressed={feedback === 'not-useful'} onclick={() => pick('not-useful')} />
    <IconButton icon="another" label="Show another" onclick={() => onanother?.()} />
  </div>
</li>

<style>
  li {
    display: grid;
    grid-template-columns: 44px 1fr auto;
    gap: 12px;
    padding: 22px 0;
    border-bottom: 1px solid var(--rule);
    align-items: start;
  }
  .num {
    font-family: var(--font-serif);
    font-size: 30px;
    line-height: 1;
    color: var(--accent);
    font-weight: 400;
  }
  .ptext {
    font-family: var(--font-serif);
    font-size: 19px;
    line-height: 1.45;
    margin: 0;
  }
  .src {
    font-size: 12.5px;
    color: var(--muted);
    margin: 10px 0 0;
  }
  .acts {
    display: flex;
    gap: 2px;
    margin-top: -6px;
  }
</style>
