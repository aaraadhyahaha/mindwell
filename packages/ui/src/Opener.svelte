<script lang="ts">
  /**
   * Chapter opener: small-caps label → 42px serif title → italic lede → 48px ink rule.
   * `ruleBelow` is the space under the rule (40px on Today, 8px in the Library, 0 on Thoughts).
   */
  let { label, title, lede, ruleBelow = 40 }: { label?: string; title: string; lede?: string; ruleBelow?: number } =
    $props();
</script>

{#if label}<p class="label">{label}</p>{/if}
<h1 class="title">{title}</h1>
{#if lede}<p class="lede">{lede}</p>{/if}
<hr class="opener-rule" style:margin-bottom="{ruleBelow}px" />

<style>
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
</style>
