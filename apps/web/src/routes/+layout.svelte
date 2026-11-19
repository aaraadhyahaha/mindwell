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
  import { goto } from '$app/navigation';

  let { children } = $props();

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
    void nav.refresh();
  });

  onMount(() => {
    const onDone = () => void goto('/');
    window.addEventListener('mindwell:done', onDone);
    const refreshNav = () => void nav.refresh();
    window.addEventListener('focus', refreshNav);
    let stop = () => {};
    void activation.load().catch(() => {});
    void settings.load().then(() => {
      stop = startReminders();
    });
    return () => {
      stop();
      window.removeEventListener('focus', refreshNav);
      window.removeEventListener('mindwell:done', onDone);
    };
  });

  const isActive = (href: string) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

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
