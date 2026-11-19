<script lang="ts">
  import Icon from './Icon.svelte';
  import WhySheet from './WhySheet.svelte';
  /** "Why this exists" (accent, 16px info icon) that opens the module's idea and evidence. */
  let { manifest }: { manifest: { title: string; idea: string; evidence: string; references: string[] } } = $props();
  let open = $state(false);
</script>

<button type="button" class="why" onclick={() => (open = true)}><Icon name="info" />Why this exists</button>
<WhySheet bind:open title={manifest.title}>
  <p>{manifest.idea}</p>
  <p>{manifest.evidence}</p>
  {#if manifest.references.length}<p class="refs">{manifest.references.join(' · ')}</p>{/if}
</WhySheet>

<style>
  .why {
    font-size: 13.5px;
    color: var(--accent);
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-weight: 600;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  .why:hover {
    text-decoration: underline;
  }
  .why :global(svg) {
    width: 16px;
    height: 16px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.6;
  }
  .refs {
    font-size: 14px;
    color: var(--muted);
  }
</style>
