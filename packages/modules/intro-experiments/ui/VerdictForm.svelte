<script lang="ts">
  import type { Store } from '@mindwell/core';
  import { Button, Choice, Field } from '@mindwell/ui';
  import { extendExperiment, setVerdict } from '../repo';

  let { store, id, ondone }: { store: Store; id: string; ondone: () => void | Promise<void> } = $props();

  let choice = $state<string | null>(null);
  let note = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);

  const options = [
    { value: 'keep', label: 'Keep' },
    { value: 'drop', label: 'Drop' },
    { value: 'extend7', label: 'Extend +7' },
    { value: 'extend14', label: 'Extend +14' },
  ];

  async function save() {
    if (!choice || busy) return;
    busy = true;
    try {
      if (choice === 'keep' || choice === 'drop') await setVerdict(store, id, choice, note);
      else await extendExperiment(store, id, choice === 'extend7' ? 7 : 14, note);
      error = null;
      await ondone();
    } catch {
      error = 'Could not save that. Please try again.';
    } finally {
      busy = false;
    }
  }
</script>

<div class="form">
  <Choice label="Your verdict" {options} bind:value={choice} />
  <Field label="Note (optional)" bind:value={note} multiline rows={2} />
  <div><Button disabled={!choice || busy} onclick={save}>Save verdict</Button></div>
  {#if error}<p class="muted" role="alert">{error}</p>{/if}
</div>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  .muted {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
</style>
