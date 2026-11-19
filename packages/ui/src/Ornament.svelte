<script lang="ts">
  /** A section break: rules either side of a small four-point star. */
</script>

<div class="ornament" aria-hidden="true">
  <svg viewBox="0 0 14 14"><path d="M7 0 9 5 14 7 9 9 7 14 5 9 0 7 5 5Z" /></svg>
</div>

<style>
  .ornament {
    display: flex;
    align-items: center;
    gap: 14px;
    color: var(--rule);
    margin: 8px 0 36px;
  }
  .ornament::before,
  .ornament::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--rule);
  }
  svg {
    width: 14px;
    height: 14px;
    fill: var(--muted);
  }
</style>
