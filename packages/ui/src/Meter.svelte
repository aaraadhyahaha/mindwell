<script lang="ts">
  /**
   * A 3px progress track. With `label`, a row above it: italic serif label left, `value` right
   * (the margin's "Stories this week" rows). `fraction` is 0–1.
   */
  let { fraction, label, value }: { fraction: number; label?: string; value?: string | number } = $props();
  const pct = $derived(`${Math.round(Math.min(1, Math.max(0, fraction)) * 1000) / 10}%`);
</script>

{#if label !== undefined}
  <div class="story">
    <b>{label}</b><span>{value ?? ''}</span>
    <div class="track"><div style:width={pct}></div></div>
  </div>
{:else}
  <div class="progress"><div style:width={pct}></div></div>
{/if}

<style>
  .story {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 12px;
    align-items: center;
    margin-top: 10px;
  }
  .story b {
    font-family: var(--font-serif);
    font-weight: 400;
    font-style: italic;
    font-size: 15px;
  }
  .story span {
    font-size: 12.5px;
    color: var(--muted);
  }
  .track {
    grid-column: 1 / -1;
    height: 3px;
    background: var(--rule);
    border-radius: 2px;
  }
  .progress {
    height: 3px;
    background: var(--rule);
    border-radius: 2px;
    margin-top: 10px;
  }
  .track div,
  .progress div {
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
  }
</style>
