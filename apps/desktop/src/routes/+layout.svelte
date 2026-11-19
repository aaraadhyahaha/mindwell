<script lang="ts">
  import '@mindwell/ui/fonts.css';
  import '@mindwell/ui/tokens.css';
  import '@mindwell/ui/base.css';
  import { page } from '$app/state';
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

  const links = $derived([
    { href: '/', label: 'Today' },
    { href: '/week', label: 'Week' },
    ...activation.active.flatMap((m) =>
      m.screens
        .filter((s) => s.inNav)
        .map((s) => ({ href: `/m/${m.manifest.id}${s.path ? `/${s.path}` : ''}`, label: s.title }))
    ),
    { href: '/library', label: 'Library' },
    { href: '/settings', label: 'Settings' }
  ]);
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
    let stop = () => {};
    void activation.load().catch(() => {});
    void settings.load().then(() => {
      stop = startReminders();
    });
    return () => {
      stop();
      stopCapture();
      window.removeEventListener('mindwell:done', onDone);
    };
  });

  const isActive = (href: string) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

{#if !bare}
  <nav aria-label="Main">
    {#each links as l (l.href)}
      <a href={l.href} aria-current={isActive(l.href) ? 'page' : undefined}>{l.label}</a>
    {/each}
  </nav>
{/if}

{@render children()}

<style>
  nav {
    max-width: var(--reading-width);
    margin: 0 auto;
    padding: var(--space-4) var(--space-5) 0;
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
    font-family: var(--font-sans);
    font-size: var(--text-14);
  }
  a {
    color: var(--muted);
    text-decoration: none;
  }
  a:hover {
    color: var(--ink);
  }
  a[aria-current='page'] {
    color: var(--ink);
  }
</style>
