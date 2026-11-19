<script lang="ts">
  import type { Snippet } from 'svelte';
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
    {#if label}<p class="label">{label}</p>{/if}
    <h1 class="title">{title}</h1>
    {#if lede}<p class="lede">{lede}</p>{/if}
    <hr class="opener-rule" />
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
  .title {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 42px;
    line-height: 1.12;
    margin: 10px 0 0;
    letter-spacing: -0.015em;
  }
  .lede {
    font-family: var(--font-serif);
    font-style: italic;
    color: var(--muted);
    font-size: 18px;
    line-height: 1.5;
    margin: 12px 0 0;
    max-width: 560px;
  }
  .opener-rule {
    width: 48px;
    border: 0;
    border-top: 1px solid var(--ink);
    margin: 28px 0 40px;
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
