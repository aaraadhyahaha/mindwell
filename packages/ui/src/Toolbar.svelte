<script lang="ts">
  import type { Snippet } from 'svelte';
  /**
   * The 58px bar at the top of every screen: running head (small caps + italic serif subtitle)
   * on the left, the screen's main action on the right. Sticks to the top of the main column.
   */
  let { head, sub, actions }: { head: string; sub?: string; actions?: Snippet } = $props();
</script>

<header class="bar">
  <div class="runhead">{head}{#if sub}<em>{sub}</em>{/if}</div>
  {#if actions}<div class="actions">{@render actions()}</div>{/if}
</header>

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 1;
    flex: none;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    border-bottom: 1px solid var(--rule);
    gap: 16px;
    background: var(--bg);
  }
  .runhead {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }
  .runhead em {
    font-family: var(--font-serif);
    font-style: italic;
    text-transform: none;
    letter-spacing: 0;
    font-size: 14px;
    font-weight: 400;
    margin-left: 10px;
  }
  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
</style>
