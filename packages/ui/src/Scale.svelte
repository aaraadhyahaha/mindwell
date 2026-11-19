<script lang="ts">
  let {
    label,
    value = $bindable(null),
    mode,
    minLabel,
    maxLabel,
    labelledby
  }: {
    label: string;
    value?: number | null;
    mode: '1-5' | '0-100';
    minLabel?: string;
    maxLabel?: string;
    /** Id of a visible heading that names the scale (e.g. a `Step` title); hides the built-in label. */
    labelledby?: string;
  } = $props();
  const uid = $props.id();

  const steps = [1, 2, 3, 4, 5];
  const tabStop = $derived(value ? value - 1 : 0);
  let boxes: HTMLButtonElement[] = $state([]);

  function onkeydown(e: KeyboardEvent, i: number) {
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(4, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, i - 1);
    if (next < 0) return;
    e.preventDefault();
    value = steps[next] ?? null;
    boxes[next]?.focus();
  }

  function oninput(e: Event) {
    value = Number((e.currentTarget as HTMLInputElement).value);
  }
</script>

<div class="scale">
  {#if !labelledby}
    <div class="head">
      <span class="label" id="{uid}-label">{label}</span>
      {#if mode === '0-100'}<span class="readout">{value === null ? 'not set' : value}</span>{/if}
    </div>
  {/if}
  {#if mode === '1-5'}
    <div class="seg" role="radiogroup" aria-labelledby={labelledby ?? `${uid}-label`}>
      {#each steps as s, i (s)}
        <button
          type="button"
          class:on={value === s}
          role="radio"
          aria-checked={value === s}
          tabindex={i === tabStop ? 0 : -1}
          bind:this={boxes[i]}
          onclick={() => (value = s)}
          onkeydown={(e) => onkeydown(e, i)}>{s}</button
        >
      {/each}
    </div>
  {:else}
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      aria-labelledby={labelledby ?? `${uid}-label`}
      class:unset={value === null}
      value={value ?? 50}
      {oninput}
    />
  {/if}
  {#if minLabel || maxLabel}
    <div class="ends" class:wide={mode === '0-100'}><span>{minLabel ?? ''}</span><span>{maxLabel ?? ''}</span></div>
  {/if}
</div>

<style>
  .scale {
    display: flex;
    flex-direction: column;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }
  .readout {
    font-size: 14px;
    color: var(--ink);
  }
  .seg {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    border: 1px solid var(--rule);
    border-radius: 10px;
    background: var(--surface);
    overflow: hidden;
    max-width: 400px;
    margin-top: 16px;
  }
  .seg button {
    height: 44px;
    border: 0;
    border-right: 1px solid var(--rule);
    background: none;
    font: 400 17px var(--font-serif);
    color: var(--ink);
    cursor: pointer;
    transition: background-color var(--motion-fast) var(--ease);
  }
  .seg button:last-child {
    border-right: 0;
  }
  .seg button:hover:not(.on) {
    background: var(--accent-soft);
  }
  .seg button.on {
    background: var(--accent);
    color: var(--on-accent);
  }
  .seg button:focus-visible {
    outline-offset: -3px;
  }
  .ends {
    display: flex;
    justify-content: space-between;
    max-width: 400px;
    font-size: 12.5px;
    color: var(--muted);
    margin-top: 8px;
    font-family: var(--font-serif);
    font-style: italic;
  }
  .ends.wide {
    max-width: none;
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
    margin: 16px 0 0;
  }
  input[type='range'].unset {
    opacity: 0.5;
  }
</style>
