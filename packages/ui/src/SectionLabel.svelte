<script lang="ts">
  import type { Snippet } from 'svelte';
  let { as = 'p', children }: { as?: 'p' | 'h2' | 'h3'; children: Snippet } = $props();
</script>

<svelte:element this={as} class="section-label">{@render children()}</svelte:element>

<style>
  .section-label {
    font-family: var(--font-sans);
    font-size: var(--text-12);
    font-weight: 500;
    line-height: var(--leading-body);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
  }
</style>
