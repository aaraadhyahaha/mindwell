<script lang="ts">
  import type { Snippet } from 'svelte';
  /** A sidebar section heading ("Daily", "Practice", "The book"). */
  let { children }: { children: Snippet } = $props();
</script>

<p class="sec">{@render children()}</p>

<style>
  .sec {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 16px 12px 6px;
    font-weight: 600;
    margin: 0;
  }
</style>
