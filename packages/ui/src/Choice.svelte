<script lang="ts">
  type Option = { value: string; label: string };
  let {
    label,
    options,
    multiple = false,
    labelledby,
    value = $bindable(null)
  }: {
    label: string;
    options: Option[];
    multiple?: boolean;
    /** Id of a visible heading that names the group (e.g. a `Step` title); hides the built-in label. */
    labelledby?: string;
    value?: string | string[] | null;
  } = $props();
  const uid = $props.id();

  const selected = $derived(Array.isArray(value) ? value : value ? [value] : []);
  const tabStop = $derived(
    Math.max(0, options.findIndex((o) => o.value === (typeof value === 'string' ? value : null)))
  );
  let buttons: HTMLButtonElement[] = [];

  function toggle(v: string) {
    if (multiple) {
      value = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
    } else {
      value = v;
    }
  }

  function onkeydown(e: KeyboardEvent, i: number) {
    if (multiple) return;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + options.length) % options.length;
    if (next < 0) return;
    e.preventDefault();
    value = options[next]?.value ?? null;
    buttons[next]?.focus();
  }
</script>

<div class="choice">
  {#if !labelledby}<span class="label" id="{uid}-label">{label}</span>{/if}
  <div
    class="pills"
    role={multiple ? 'group' : 'radiogroup'}
    aria-labelledby={labelledby ?? `${uid}-label`}
  >
    {#each options as o, i (o.value)}
      {#if multiple}
        <button
          type="button"
          class="pill"
          aria-pressed={selected.includes(o.value)}
          onclick={() => toggle(o.value)}>{o.label}</button
        >
      {:else}
        <button
          type="button"
          class="pill"
          role="radio"
          aria-checked={selected.includes(o.value)}
          tabindex={i === tabStop ? 0 : -1}
          bind:this={buttons[i]}
          onclick={() => toggle(o.value)}
          onkeydown={(e) => onkeydown(e, i)}>{o.label}</button
        >
      {/if}
    {/each}
  </div>
</div>

<style>
  .choice {
    display: flex;
    flex-direction: column;
  }
  .label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
  }
  .pill {
    height: 38px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid var(--rule);
    background: var(--surface);
    font: 500 14px var(--font-sans);
    color: var(--ink);
    cursor: pointer;
    transition:
      background-color var(--motion-fast) var(--ease),
      border-color var(--motion-fast) var(--ease);
  }
  .pill:hover {
    border-color: var(--muted);
  }
  .pill[aria-pressed='true'],
  .pill[aria-checked='true'] {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }
</style>
