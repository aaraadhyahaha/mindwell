<script lang="ts">
  import type { Snippet } from 'svelte';
  /** Ruled, numbered list of journal prompts. Children are `PromptCard`s. */
  let { children }: { children: Snippet } = $props();
</script>

<ol class="prompts">{@render children()}</ol>

<style>
  .prompts {
    list-style: none;
    margin: 18px 0 0;
    padding: 0;
    border-top: 1px solid var(--rule);
  }
</style>
