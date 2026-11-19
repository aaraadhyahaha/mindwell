<script lang="ts">
  import type { Component } from 'svelte';
  import type { ModuleViewProps, Signals, Store } from '@mindwell/core';
  import { buildSignals, localDay } from '@mindwell/core';
  import { page } from '$app/state';
  import { Page, WhySheet } from '@mindwell/ui';
  import { activation } from '$lib/activation.svelte';
  import { getStore } from '$lib/db';
  import { capture } from '$lib/capture.svelte';
  import { isAuxWindow } from '$lib/window';

  const bare = isAuxWindow();

  // Mounts an active module's screen at /m/<id>/<path>. Inactive or unknown → not found.
  const mod = $derived(activation.active.find((m) => m.manifest.id === page.params.id) ?? null);
  const screen = $derived(mod?.screens.find((s) => s.path === (page.params.path ?? '')) ?? null);
  const Screen = $derived(screen?.component as Component<ModuleViewProps> | undefined);

  let store = $state<Store | null>(null);
  let signals = $state<Signals | null>(null);
  let day = $state(localDay());
  let error = $state<string | null>(null);
  let whyOpen = $state(false);

  // The capture window lives for the whole session: reload activation and signals on each open,
  // so a chapter marked read in the main window (or a failed first load) is picked up.
  $effect(() => {
    void page.url.pathname;
    void capture.openCount;
    void load();
  });

  async function load() {
    try {
      error = null;
      if (!activation.loaded || bare) await activation.load();
      const s = await getStore();
      day = localDay();
      signals = (await buildSignals({ store: s, day, active: activation.active, chapters: activation.read })).signals;
      store = s;
    } catch {
      error = 'This screen could not be loaded.';
    }
  }
</script>

{#if error}
  <Page title="Not available"><p class="note">{error}</p></Page>
{:else if activation.loaded && (!mod || !screen)}
  <Page title="Not available">
    <p class="note">This screen belongs to a chapter that isn't marked read, or it doesn't exist.</p>
  </Page>
{:else if mod && Screen && store && signals}
  {#key `${page.url.pathname}:${capture.openCount}`}
    <Screen {store} {day} {signals} />
  {/key}
  {#if !bare}
  <p class="why-row"><button type="button" class="why" onclick={() => (whyOpen = true)}>Why this exists</button></p>
  {/if}
  <WhySheet bind:open={whyOpen} title={mod.manifest.title}>
    <p>{mod.manifest.idea}</p>
    <p>{mod.manifest.evidence}</p>
    {#if mod.manifest.references.length}
      <p class="note">{mod.manifest.references.join(' · ')}</p>
    {/if}
  </WhySheet>
{/if}

<style>
  .note {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  .why-row {
    max-width: var(--reading-width);
    margin: 0 auto;
    padding: 0 var(--space-5) var(--space-6);
  }
  .why {
    background: none;
    border: 0;
    padding: 0;
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
