<script lang="ts">
  import type { Snippet } from 'svelte';
  import SectionLabel from './SectionLabel.svelte';
  let { label, title, children }: { label?: string; title: string; children: Snippet } = $props();
</script>

<div class="page">
  <header>
    {#if label}<SectionLabel>{label}</SectionLabel>{/if}
    <h1>{title}</h1>
    <div class="rule"></div>
  </header>
  {@render children()}
</div>

<style>
  .page {
    max-width: var(--reading-width);
    margin: 0 auto;
    padding: var(--space-7) var(--space-5);
  }
  header {
    margin-bottom: var(--space-6);
  }
  h1 {
    font-family: var(--font-serif);
    font-size: var(--text-24);
    font-weight: 500;
    line-height: var(--leading-heading);
    margin-top: var(--space-2);
  }
  .rule {
    width: 40px;
    height: 0;
    border-top: 1px solid var(--rule);
    margin-top: var(--space-4);
  }
</style>
