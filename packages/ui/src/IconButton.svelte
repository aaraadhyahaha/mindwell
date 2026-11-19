<script lang="ts">
  import type { IconName } from './Icon.svelte';
  import Icon from './Icon.svelte';
  /** 44px square icon button. `label` is its accessible name (and tooltip). */
  let {
    icon,
    label,
    pressed,
    disabled = false,
    onclick
  }: { icon: IconName; label: string; pressed?: boolean; disabled?: boolean; onclick?: (e: MouseEvent) => void } = $props();
</script>

<button class="ib" type="button" aria-label={label} title={label} aria-pressed={pressed} {disabled} {onclick}>
  <Icon name={icon} />
</button>

<style>
  .ib {
    width: 44px;
    height: 44px;
    border-radius: 9px;
    border: 1px solid transparent;
    background: none;
    display: grid;
    place-items: center;
    color: var(--muted);
    cursor: pointer;
    padding: 0;
    transition:
      background-color var(--motion-fast) var(--ease),
      color var(--motion-fast) var(--ease);
  }
  .ib :global(svg) {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ib:hover:not(:disabled):not([aria-pressed='true']) {
    color: var(--ink);
  }
  .ib[aria-pressed='true'] {
    background: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent);
  }
  .ib:disabled {
    opacity: 0.45;
    cursor: default;
  }
</style>
