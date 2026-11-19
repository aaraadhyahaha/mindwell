<script lang="ts">
  import type { Snippet } from 'svelte';
  import Opener from './Opener.svelte';
  /**
   * A screen's content under the toolbar. Opens with the chapter opener: label → 42px serif
   * title → italic lede → 48px ink rule. With `margin`, a 280px "In the margin" column sits
   * beside the 660px main column (left rule, small-caps labels, serif notes).
   */
  let {
    label,
    title,
    lede,
    ariaLabel,
    marginLabel = 'In the margin',
    children,
    margin
  }: {
    label?: string;
    title: string;
    lede?: string;
    ariaLabel?: string;
    marginLabel?: string;
    children: Snippet;
    margin?: Snippet;
  } = $props();
</script>

<div class="page" class:two={!!margin}>
  <section aria-label={ariaLabel ?? label ?? title}>
    <Opener {label} {title} {lede} />
    {@render children()}
  </section>
  {#if margin}
    <aside class="margin" aria-label={marginLabel}>
      <p class="label margin-label">{marginLabel}</p>
      {@render margin()}
    </aside>
  {/if}
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: minmax(0, 660px);
    padding: 52px 64px 72px;
    justify-content: center;
  }
  .page.two {
    grid-template-columns: minmax(0, 660px) 280px;
    gap: 80px;
  }
  .label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 0;
  }
  .margin {
    border-left: 1px solid var(--rule);
    padding-left: 32px;
  }
  .margin-label {
    margin-bottom: 22px;
  }
  /* Narrow windows: the margin column moves under the main column. */
  @media (max-width: 1219px) {
    .page,
    .page.two {
      grid-template-columns: minmax(0, 660px);
      gap: 48px;
      padding: 40px 40px 64px;
    }
    .margin {
      border-left: 0;
      border-top: 1px solid var(--rule);
      padding: 32px 0 0;
    }
  }
</style>
