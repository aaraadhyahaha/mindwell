<script lang="ts">
  import type { Snippet } from 'svelte';
  /** Full-window layout: 252px sidebar + fluid main column. The main column scrolls; the sidebar stays. */
  let { sidebar, children }: { sidebar: Snippet; children: Snippet } = $props();
</script>

<div class="shell">
  {@render sidebar()}
  <main class="main">{@render children()}</main>
</div>

<style>
  .shell {
    display: grid;
    grid-template-columns: 252px 1fr;
    height: 100vh;
    background: var(--bg);
  }
  .main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow-y: auto;
  }
</style>
