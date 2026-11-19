<script lang="ts">
  let {
    label,
    value = $bindable(''),
    multiline = false,
    hint,
    placeholder,
    rows = 4
  }: {
    label: string;
    value?: string;
    multiline?: boolean;
    hint?: string;
    placeholder?: string;
    rows?: number;
  } = $props();
  const uid = $props.id();
  const hintId = $derived(hint ? `${uid}-hint` : undefined);
</script>

<div class="field">
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
    gap: var(--space-1);
  }
  label,
  .hint {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  input,
  textarea {
    font-family: var(--font-serif);
    font-size: var(--text-16);
    line-height: var(--leading-body);
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-3);
    width: 100%;
    resize: vertical;
    transition: border-color var(--motion-fast) var(--ease);
  }
  input:hover,
  textarea:hover {
    border-color: var(--muted);
  }
  ::placeholder {
    color: var(--muted);
  }
</style>
