<script lang="ts">
  import '$lib/ui/fonts.css';
  import '$lib/ui/tokens.css';
  import '$lib/ui/base.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { settings } from '$lib/settings.svelte';
  import { startReminders } from '$lib/reminders.svelte';

  let { children } = $props();

  const links = [
    { href: '/', label: 'Today' },
    { href: '/week', label: 'Week' },
    { href: '/library', label: 'Library' },
    { href: '/settings', label: 'Settings' }
  ];
  onMount(() => {
    let stop = () => {};
    void settings.load().then(() => {
      stop = startReminders();
    });
    return () => stop();
  });

  const isActive = (href: string) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<nav aria-label="Main">
  {#each links as l (l.href)}
    <a href={l.href} aria-current={isActive(l.href) ? 'page' : undefined}>{l.label}</a>
  {/each}
</nav>

{@render children()}

<style>
  nav {
    max-width: var(--reading-width);
    margin: 0 auto;
    padding: var(--space-4) var(--space-5) 0;
    display: flex;
    gap: var(--space-4);
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
