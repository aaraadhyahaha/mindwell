<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div class="card">{@render children()}</div>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    padding: var(--space-5);
  }
</style>
