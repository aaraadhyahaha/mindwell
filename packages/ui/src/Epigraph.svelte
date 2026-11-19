<script lang="ts">
  import type { Snippet } from 'svelte';
  /** A set-off prompt in italic serif with a hanging accent quote mark; `source` sits under it. */
  let { text, source }: { text: string; source?: Snippet } = $props();
</script>

<blockquote class="epigraph"><p>{text}</p></blockquote>
{#if source}<div class="src">{@render source()}</div>{/if}

<style>
  .epigraph {
    margin: 18px 0 0;
    padding: 0 0 0 28px;
    position: relative;
  }
  .epigraph::before {
    content: '\201C';
    position: absolute;
    left: -4px;
    top: -14px;
    font: 400 56px/1 var(--font-serif);
    color: var(--accent);
  }
  .epigraph p {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 23px;
    line-height: 1.42;
    margin: 0;
  }
  .src {
    font-size: 12.5px;
    color: var(--muted);
    margin: 10px 0 0;
  }
</style>
