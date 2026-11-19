<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { IconName } from './Icon.svelte';
  import Icon from './Icon.svelte';
  /**
   * primary = accent fill (44px), secondary = surface + rule outline (38px), quiet = accent text.
   * With `href` it renders a link styled as a button. `icon` adds a 16px leading stroke icon.
   */
  let {
    variant = 'primary',
    type = 'button',
    disabled = false,
    pressed,
    href,
    icon,
    onclick,
    children
  }: {
    variant?: 'primary' | 'secondary' | 'quiet';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    pressed?: boolean;
    href?: string;
    icon?: IconName;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  } = $props();
</script>

{#if href}
  <a class="btn {variant}" {href} {onclick}>
    {#if icon}<Icon name={icon} />{/if}{@render children()}
  </a>
{:else}
  <button class="btn {variant}" {type} {disabled} aria-pressed={pressed} {onclick}>
    {#if icon}<Icon name={icon} />{/if}{@render children()}
  </button>
{/if}

<style>
  .btn {
    font: 600 14px/1 var(--font-sans);
    height: 38px;
    padding: 0 16px;
    border-radius: 9px;
    border: 1px solid var(--rule);
    background: var(--surface);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background-color var(--motion-fast) var(--ease),
      border-color var(--motion-fast) var(--ease),
      opacity var(--motion-fast) var(--ease);
  }
  .btn :global(svg) {
    width: 16px;
    height: 16px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .secondary:hover:not(:disabled) {
    border-color: var(--muted);
  }
  .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    height: 44px;
    padding: 0 22px;
  }
  .primary:hover:not(:disabled) {
    opacity: 0.88;
  }
  .quiet {
    background: none;
    border-color: transparent;
    color: var(--accent);
    padding: 0 8px;
  }
  .quiet:hover:not(:disabled) {
    text-decoration: underline;
  }
  .btn[aria-pressed='true'] {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
