<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    variant = 'primary',
    type = 'button',
    disabled = false,
    pressed,
    onclick,
    children
  }: {
    variant?: 'primary' | 'secondary' | 'quiet';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    pressed?: boolean;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  } = $props();
</script>

<button class={variant} {type} {disabled} aria-pressed={pressed} {onclick}>
  {@render children()}
</button>

<style>
  button {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    line-height: var(--leading-body);
    padding: var(--space-2) var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: transparent;
    cursor: pointer;
    transition:
      background-color var(--motion-fast) var(--ease),
      border-color var(--motion-fast) var(--ease),
      opacity var(--motion-fast) var(--ease);
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .primary {
    background: var(--accent);
    color: var(--bg);
    border-color: var(--accent);
  }
  .primary:hover:not(:disabled) {
    opacity: 0.88;
  }
  .secondary {
    color: var(--ink);
    border-color: var(--ink);
  }
  .secondary:hover:not(:disabled) {
    background: var(--accent-soft);
  }
  .quiet {
    color: var(--ink);
    padding-left: var(--space-2);
    padding-right: var(--space-2);
  }
  .quiet:hover:not(:disabled) {
    text-decoration: underline;
  }
  button[aria-pressed='true'] {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
</style>
