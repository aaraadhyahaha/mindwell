<script lang="ts">
  import type { Snippet } from 'svelte';
  /** A numbered step: italic roman numeral in the accent colour, 20px serif heading, then content. */
  let { n, title, id, children }: { n: string; title: string; id?: string; children: Snippet } = $props();
</script>

<div class="step">
  <div class="step-head"><span class="n">{n}</span><h2 {id}>{title}</h2></div>
  {@render children()}
</div>

<style>
  .step {
    margin: 0 0 44px;
  }
  .step-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .n {
    font-family: var(--font-serif);
    font-style: italic;
    color: var(--accent);
    font-size: 16px;
  }
  h2 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 20px;
    line-height: 1.5;
    margin: 0;
  }
</style>
