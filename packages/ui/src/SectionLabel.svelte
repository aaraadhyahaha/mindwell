<script lang="ts">
  import type { Snippet } from 'svelte';
  let { as = 'p', children }: { as?: 'p' | 'h2' | 'h3'; children: Snippet } = $props();
</script>

<svelte:element this={as} class="section-label">{@render children()}</svelte:element>

<style>
  .section-label {
    font-family: var(--font-sans);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 0;
  }
</style>
