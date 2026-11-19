<script lang="ts">
  /** A 1–5 rating as filled / open dots. */
  let { value, max = 5 }: { value: number; max?: number } = $props();
</script>

<div class="dots" role="img" aria-label="Rated {value} of {max}">
  {#each { length: max }, i (i)}<span class="dot" class:f={i < value}></span>{/each}
</div>

<style>
  .dots {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }
  .dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 1.25px solid var(--ink);
  }
  .dot.f {
    background: var(--ink);
  }
</style>
