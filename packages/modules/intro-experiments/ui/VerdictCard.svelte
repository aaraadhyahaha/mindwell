<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Card } from '@mindwell/ui';
  import { activeExperiments } from '../repo';
  import type { ExperimentRecord } from '../schema';
  import VerdictForm from './VerdictForm.svelte';

  let { store, day }: ModuleViewProps = $props();
  let due = $state<ExperimentRecord[]>([]);

  async function load() {
    due = (await activeExperiments(store)).filter((e) => e.end_day <= day);
  }

  $effect(() => {
    void day;
    void load();
  });
</script>

{#each due as e (e.id)}
  <Card>
    <p>Your experiment with {e.label} has finished. Keep, drop or extend?</p>
    <VerdictForm {store} id={e.id} ondone={load} />
  </Card>
{/each}
