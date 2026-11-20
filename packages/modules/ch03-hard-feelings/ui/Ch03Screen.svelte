<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Opener, WhyLink } from '@mindwell/ui';
  import { manifest } from '../manifest';
  import { TABS, tabFromSearch, type TabId } from '../view';
  import DefuseTab from './DefuseTab.svelte';
  import EventsTab from './EventsTab.svelte';
  import GratitudeTab from './GratitudeTab.svelte';
  import WritingTab from './WritingTab.svelte';

  let props: ModuleViewProps = $props();
  let tab = $state<TabId>(tabFromSearch(window.location.search));
  const uid = $props.id();
  const tabEls: HTMLButtonElement[] = [];

  function select(id: TabId, focus = false) {
    tab = id;
    const url = new URL(window.location.href);
    if (id === 'defuse') url.searchParams.delete('tab');
    else url.searchParams.set('tab', id);
    history.replaceState(history.state, '', url);
    if (focus) tabEls[TABS.findIndex((t) => t.id === id)]?.focus();
  }

  function onkeydown(e: KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === 'ArrowRight' ? (i + 1) % TABS.length
      : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    select(TABS[next]!.id, true);
  }
</script>

<div class="page">
  <Opener label="Chapter 3" title="Making room" lede="Some thoughts don't need arguing with. Step back, reframe, or put them on paper." ruleBelow={0}>
    {#snippet aside()}<WhyLink {manifest} />{/snippet}
  </Opener>

  <div class="tabs" role="tablist" aria-label="Making room" tabindex="-1" {onkeydown}>
    {#each TABS as t, i (t.id)}
      <button
        bind:this={tabEls[i]}
        id="{uid}-tab-{t.id}"
        type="button"
        role="tab"
        aria-selected={tab === t.id}
        aria-controls="{uid}-panel"
        tabindex={tab === t.id ? 0 : -1}
        onclick={() => select(t.id)}>{t.label}</button
      >
    {/each}
  </div>

  <div id="{uid}-panel" role="tabpanel" aria-labelledby="{uid}-tab-{tab}">
    {#if tab === 'defuse'}<DefuseTab {...props} />
    {:else if tab === 'events'}<EventsTab {...props} />
    {:else if tab === 'writing'}<WritingTab {...props} />
    {:else}<GratitudeTab {...props} />{/if}
  </div>
</div>

<style>
  .page {
    padding: 52px 64px 72px;
    max-width: 1188px;
    margin: 0 auto;
    width: 100%;
  }
  .tabs {
    display: flex;
    gap: 28px;
    border-bottom: 1px solid var(--rule);
    margin: 36px 0 44px;
    outline: none;
  }
  [role='tab'] {
    font: 600 13px/1 var(--font-sans);
    color: var(--muted);
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    padding: 0 0 12px;
    min-height: 44px;
    display: inline-flex;
    align-items: flex-end;
    cursor: pointer;
  }
  [role='tab']:hover {
    color: var(--ink);
  }
  [role='tab'][aria-selected='true'] {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
  [role='tab']:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
    border-radius: 4px;
  }
  @media (max-width: 720px) {
    .page {
      padding: 32px 16px 56px;
    }
    .tabs {
      gap: 20px;
      overflow-x: auto;
    }
  }
</style>
