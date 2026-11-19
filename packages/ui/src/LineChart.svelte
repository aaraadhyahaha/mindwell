<script lang="ts">
  type Point = { x: number; y: number };
  type Series = { label: string; points: Point[] };
  let {
    series,
    yMin,
    yMax,
    height = 160,
    label,
    empty = 'Nothing to chart yet.'
  }: {
    series: Series[];
    yMin?: number;
    yMax?: number;
    height?: number;
    label: string;
    empty?: string;
  } = $props();

  const W = 600;
  const padL = 8;
  const padR = 110;
  const padT = 12;
  const padB = 12;

  const all = $derived(series.flatMap((s) => s.points));
  const hasData = $derived(all.length > 0);
  const xs = $derived(all.map((p) => p.x));
  const ys = $derived(all.map((p) => p.y));
  const x0 = $derived(Math.min(...xs));
  const x1 = $derived(Math.max(...xs));
  const y0 = $derived(yMin ?? Math.min(...ys));
  const y1 = $derived(yMax ?? Math.max(...ys));

  function sx(x: number) {
    return x1 === x0 ? padL : padL + ((x - x0) / (x1 - x0)) * (W - padL - padR);
  }
  function sy(y: number) {
    return y1 === y0
      ? height / 2
      : padT + (1 - (y - y0) / (y1 - y0)) * (height - padT - padB);
  }
  function path(pts: Point[]) {
    return [...pts]
      .sort((a, b) => a.x - b.x)
      .map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
      .join(' ');
  }
  function last(pts: Point[]) {
    return pts.reduce((a, b) => (b.x >= a.x ? b : a));
  }
</script>

{#if !hasData}
  <p class="empty">{empty}</p>
{:else}
  <svg viewBox="0 0 {W} {height}" width="100%" role="img" aria-label={label}>
    <line class="base" x1={padL} x2={W - padR} y1={height - padB} y2={height - padB} />
    {#each series as s, i (s.label)}
      {#if s.points.length > 0}
        <path class="line" class:second={i > 0} d={path(s.points)} />
        {#if s.points.length === 1}
          <circle class="dot" class:second={i > 0} cx={sx(s.points[0]!.x)} cy={sy(s.points[0]!.y)} r="2.5" />
        {/if}
        <text
          class="tag"
          class:second={i > 0}
          x={sx(last(s.points).x) + 8}
          y={sy(last(s.points).y) + 4}>{s.label}</text
        >
      {/if}
    {/each}
  </svg>
{/if}

<style>
  svg {
    display: block;
    overflow: visible;
  }
  .base {
    stroke: var(--rule);
    stroke-width: 1;
  }
  .line {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .line.second {
    stroke: var(--muted);
    stroke-dasharray: 4 3;
  }
  .dot {
    fill: var(--ink);
  }
  .dot.second {
    fill: var(--muted);
  }
  .tag {
    font-family: var(--font-sans);
    font-size: 12px;
    fill: var(--ink);
  }
  .tag.second {
    fill: var(--muted);
  }
  .empty {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
</style>
