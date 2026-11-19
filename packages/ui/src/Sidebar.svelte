<script lang="ts">
  import type { Snippet } from 'svelte';
  /** Sidebar: wordmark, then sections (`NavLabel`, `NavItem`, `Toc`), then `footer` pinned to the bottom. */
  let {
    title = 'mindwell',
    subtitle,
    children,
    footer
  }: { title?: string; subtitle?: string; children: Snippet; footer?: Snippet } = $props();
</script>

<nav class="side" aria-label="Sections">
  <div class="brand">
    <b>{title}</b>{#if subtitle}<span>{subtitle}</span>{/if}
  </div>
  {@render children()}
  <div class="spacer"></div>
  {@render footer?.()}
</nav>

<style>
  .side {
    background: var(--side);
    border-right: 1px solid var(--rule);
    display: flex;
    flex-direction: column;
    padding: 22px 12px 14px;
    overflow-y: auto;
  }
  .brand {
    padding: 2px 12px 18px;
    border-bottom: 1px solid var(--rule);
    margin: 0 0 6px;
  }
  .brand b {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 24px;
    display: block;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  .brand span {
    font-size: 12px;
    color: var(--muted);
    font-family: var(--font-serif);
    font-style: italic;
  }
  .spacer {
    flex: 1;
  }
</style>
