<script lang="ts">
  import '@mindwell/ui/fonts.css';
  import '@mindwell/ui/tokens.css';
  import '@mindwell/ui/base.css';
  import { Shell, Sidebar, NavLabel, NavItem, Toc } from '@mindwell/ui';
  import type { TocEntry } from '@mindwell/ui';
  import { page } from '$app/state';
  import { afterNavigate } from '$app/navigation';
  import { nav } from '$lib/nav.svelte';
  import { moduleNavLinks, tocRows } from '$lib/nav';
  import { onMount } from 'svelte';
  import { settings } from '$lib/settings.svelte';
  import { startReminders } from '$lib/reminders.svelte';
  import { activation } from '$lib/activation.svelte';
  import { isAuxWindow } from '$lib/window';
  import { capture, startCaptureSync } from '$lib/capture.svelte';
  import { goto } from '$app/navigation';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { listen } from '@tauri-apps/api/event';

  let { children } = $props();

  // Small extra windows (the capture window) render the screen alone: no nav, no reminders.
  const bare = isAuxWindow();
  // An extra window paints no page background of its own: its screen draws the whole window.
  if (bare && typeof document !== 'undefined') document.documentElement.dataset.window = 'aux';

  const practice = $derived(moduleNavLinks(activation.active));
  const toc = $derived<TocEntry[]>(
    tocRows(activation.library).map((r) => ({
      href: `/library#chapter-${r.chapter}`,
      number: r.number,
      title: r.title,
      read: r.read
    }))
  );

  afterNavigate(() => {
    if (!bare) void nav.refresh();
  });

  onMount(() => {
    const onDone = () => {
      if (bare) void getCurrentWindow().hide();
      else void goto('/');
    };
    window.addEventListener('mindwell:done', onDone);
    if (bare) {
      let unlisten = () => {};
      let gone = false;
      void listen('capture:open', () => capture.openCount++).then((u) => {
        if (gone) u();
        else unlisten = u;
      });
      return () => {
        gone = true;
        unlisten();
        window.removeEventListener('mindwell:done', onDone);
      };
    }
    const stopCapture = startCaptureSync();
    const refreshNav = () => void nav.refresh();
    window.addEventListener('focus', refreshNav);
    let stop = () => {};
    void activation.load().catch(() => {});
    void settings.load().then(() => {
      stop = startReminders();
    });
    return () => {
      stop();
      stopCapture();
      window.removeEventListener('focus', refreshNav);
      window.removeEventListener('mindwell:done', onDone);
    };
  });

  const isActive = (href: string) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

{#if bare}
  {@render children()}
{:else}
  <Shell>
    {#snippet sidebar()}
      <Sidebar subtitle="a companion to Clear Mind, Steady Work">
        <NavLabel>Daily</NavLabel>
        <NavItem href="/" label="Today" icon="today" current={isActive('/')} />
        <NavItem href="/week" label="This week" icon="week" current={isActive('/week')} />
        {#if practice.length > 0}
          <NavLabel>Practice</NavLabel>
          {#each practice as l (l.href)}
            <NavItem href={l.href} label={l.label} icon={l.icon} count={nav.counts[l.href] ?? null} current={isActive(l.href)} />
          {/each}
        {/if}
        <NavLabel>The book</NavLabel>
        <NavItem href="/library" label="Library" icon="library" current={isActive('/library')} />
        <Toc entries={toc} />
        {#snippet footer()}
          <NavItem href="/settings" label="Settings" icon="settings" current={isActive('/settings')} />
        {/snippet}
      </Sidebar>
    {/snippet}
    {@render children()}
  </Shell>
{/if}
