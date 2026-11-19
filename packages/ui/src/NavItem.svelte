<script lang="ts">
  import type { IconName } from './Icon.svelte';
  import Icon from './Icon.svelte';
  /** A sidebar row: 18px stroke icon, label, optional count. The current row gets the accent-soft fill and accent text. */
  let {
    href,
    label,
    icon,
    count = null,
    current = false
  }: { href: string; label: string; icon?: IconName | string; count?: number | null; current?: boolean } = $props();
</script>

<a class="nav" class:on={current} {href} aria-current={current ? 'page' : undefined}>
  <Icon name={icon} />{label}{#if count !== null}<span class="count">{count}</span>{/if}
</a>

<style>
  .nav {
    display: flex;
    align-items: center;
    gap: 11px;
    height: 36px;
    padding: 0 12px;
    border-radius: 8px;
    color: var(--ink);
    text-decoration: none;
    font-size: 14.5px;
    font-weight: 500;
    transition: background-color var(--motion-fast) var(--ease);
  }
  .nav :global(svg) {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    color: var(--muted);
    flex: none;
  }
  .nav:hover:not(.on) {
    background: color-mix(in srgb, var(--surface) 55%, transparent);
  }
  .nav.on {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .nav.on :global(svg) {
    color: var(--accent);
  }
  .count {
    margin-left: auto;
    font-size: 12px;
    color: var(--muted);
    font-weight: 500;
  }
</style>
