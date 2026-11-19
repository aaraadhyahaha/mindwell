<script lang="ts">
  let {
    label,
    value = $bindable(null),
    mode,
    minLabel,
    maxLabel
  }: {
    label: string;
    value?: number | null;
    mode: '1-5' | '0-100';
    minLabel?: string;
    maxLabel?: string;
  } = $props();
  const uid = $props.id();

  const steps = [1, 2, 3, 4, 5];
  const tabStop = $derived(value ? value - 1 : 0);
  let boxes: HTMLButtonElement[] = [];

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
  <div class="head">
    <span class="label" id="{uid}-label">{label}</span>
    <span class="readout">{value === null ? 'not set' : value}</span>
  </div>
  {#if mode === '1-5'}
    <div class="boxes" role="radiogroup" aria-labelledby="{uid}-label">
      {#each steps as s, i (s)}
        <button
          type="button"
          class="box"
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
      aria-labelledby="{uid}-label"
      class:unset={value === null}
      value={value ?? 50}
      {oninput}
    />
  {/if}
  {#if minLabel || maxLabel}
    <div class="ends"><span>{minLabel ?? ''}</span><span>{maxLabel ?? ''}</span></div>
  {/if}
</div>

<style>
  .scale {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .label,
  .readout,
  .ends {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  .readout {
    color: var(--ink);
  }
  .ends {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-12);
  }
  .boxes {
    display: flex;
    gap: var(--space-2);
  }
  .box {
    flex: 1;
    font-family: var(--font-sans);
    font-size: var(--text-16);
    padding: var(--space-3) 0;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
    transition:
      background-color var(--motion-fast) var(--ease),
      border-color var(--motion-fast) var(--ease);
  }
  .box:hover {
    border-color: var(--muted);
  }
  .box[aria-checked='true'] {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
    margin: var(--space-2) 0;
  }
  input[type='range'].unset {
    opacity: 0.5;
  }
</style>
