<script lang="ts">
  import type { BaseRecord, ModuleViewProps } from '@mindwell/core';
  import { reviewWeek } from '@mindwell/core';

  let { store, day }: ModuleViewProps = $props();
  let count = $state<number | null>(null);

  $effect(() => {
    const week = new Set(reviewWeek(day));
    void store.list<BaseRecord & { day: string }>('dev_notes').then((rows) => {
      count = rows.filter((r) => week.has(r.day)).length;
    });
  });
</script>

{#if count !== null}
  <p>{count === 0 ? 'No dev notes this week.' : `${count} dev note${count === 1 ? '' : 's'} this week.`}</p>
{/if}
