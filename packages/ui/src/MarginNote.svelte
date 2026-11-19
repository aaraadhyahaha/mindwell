<script lang="ts">
  import type { Snippet } from 'svelte';
  /**
   * A note in the margin column. The mockup sets every paragraph of a note in serif 15px,
   * its label included (Tinos bold small caps); `meta` lines are serif 12.5px muted.
   * Use `<p>` for note text and `<p class="meta">` for meta lines inside.
   */
  let { label, children }: { label: string; children: Snippet } = $props();
</script>

<div class="mnote">
  <p class="label">{label}</p>
  {@render children()}
</div>

<style>
  .mnote {
    margin: 0 0 30px;
  }
  .mnote :global(p) {
    font-family: var(--font-serif);
    font-size: 15px;
    line-height: 1.5;
    margin: 6px 0 0;
  }
  .label {
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }
  .mnote :global(.meta) {
    font-size: 12.5px;
    color: var(--muted);
    margin-top: 4px;
  }
</style>
