<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Button, Card, appHref } from '@mindwell/ui';
  import { listDrafts } from '../repo';

  let { store, day }: ModuleViewProps = $props();
  let draftId = $state<string | null>(null);

  $effect(() => {
    void day;
    void listDrafts(store).then((d) => (draftId = d[0]?.id ?? null));
  });
</script>

<Card>
  <p class="title">Start a thought record</p>
  <p class="muted">When a thought hits hard, check it like a fair judge.</p>
  <div class="acts">
    <Button variant="secondary" href="/m/ch02/new" icon="plus">New thought record</Button>
    {#if draftId}<a class="link" href={appHref(`/m/ch02/new?id=${draftId}`)}>Resume your draft</a>{/if}
  </div>
</Card>

<style>
  .title {
    font-family: var(--font-serif);
    font-size: 17px;
    margin: 0;
  }
  .muted {
    font-size: var(--text-14);
    color: var(--muted);
    margin: 4px 0 0;
  }
  .acts {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-top: var(--space-3);
  }
  .link {
    font: 600 12.5px var(--font-sans);
    color: var(--accent);
    text-decoration: none;
  }
  .link:hover {
    text-decoration: underline;
  }
</style>
