<script lang="ts">
  import type { Snippet } from 'svelte';
  /** A small accent-soft pill label ("Kept"). */
  let { children }: { children: Snippet } = $props();
</script>

<span class="tag">{@render children()}</span>

<style>
  .tag {
    display: inline-block;
    font: 600 11.5px/1 var(--font-sans);
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    vertical-align: 2px;
  }
</style>
