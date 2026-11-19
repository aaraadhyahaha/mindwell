<script lang="ts">
  let {
    label,
    value = $bindable(''),
    multiline = false,
    hint,
    placeholder,
    rows = 4,
    variant = 'box'
  }: {
    label: string;
    value?: string;
    multiline?: boolean;
    hint?: string;
    placeholder?: string;
    rows?: number;
    /** `line`: the 20px serif single line with an ink underline (Today's intention). */
    variant?: 'box' | 'line';
  } = $props();
  const uid = $props.id();
  const hintId = $derived(hint ? `${uid}-hint` : undefined);
</script>

<div class="field {variant}">
  <label for={uid}>{label}</label>
  {#if multiline}
    <textarea id={uid} bind:value {rows} {placeholder} aria-describedby={hintId}></textarea>
  {:else}
    <input id={uid} type="text" bind:value {placeholder} aria-describedby={hintId} />
  {/if}
  {#if hint}<p id={hintId} class="hint">{hint}</p>{/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }
  .hint {
    font-size: 12.5px;
    color: var(--muted);
    margin-top: 4px;
  }
  input,
  textarea {
    font-family: var(--font-serif);
    font-size: 16px;
    line-height: 1.5;
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: 9px;
    padding: 8px 12px;
    width: 100%;
    resize: vertical;
    transition: border-color var(--motion-fast) var(--ease);
  }
  input:hover,
  textarea:hover {
    border-color: var(--muted);
  }
  ::placeholder {
    color: var(--placeholder);
    font-style: italic;
  }
  .line {
    gap: 0;
  }
  .line input {
    display: block;
    width: 100%;
    border: 0;
    border-bottom: 1px solid var(--ink);
    border-radius: 0;
    background: transparent;
    font: 400 20px var(--font-serif);
    padding: 12px 0 10px;
    margin-top: 26px;
    color: var(--ink);
    outline: none;
  }
  .line input:focus-visible {
    border-bottom-color: var(--accent);
    box-shadow: 0 1px 0 0 var(--accent);
  }
  .line .hint {
    margin-top: 8px;
  }
</style>
