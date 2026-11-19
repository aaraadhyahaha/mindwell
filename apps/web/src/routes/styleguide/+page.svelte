<script lang="ts">
  import { Choice, SectionLabel, Toolbar, setTheme, theme, type ThemePreference } from '@mindwell/ui';
  import Panel from './Panel.svelte';

  const options = [
    { value: 'system', label: 'System' },
    { value: 'day', label: 'Day' },
    { value: 'night', label: 'Night' }
  ];
  let pref = $state<string | null>(theme.preference);
  $effect(() => {
    if (pref) setTheme(pref as ThemePreference);
  });
</script>

<svelte:head><title>mindwell styleguide</title></svelte:head>

<Toolbar head="Styleguide" sub="development only" />
<header>
  <SectionLabel as="h2">Styleguide (dev only)</SectionLabel>
  <Choice label="Theme override for the whole app" {options} bind:value={pref} />
  <p class="note">Tab through to see focus.</p>
</header>

<div class="panels">
  <Panel theme="day" />
  <Panel theme="night" />
</div>

<style>
  header {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-5);
  }
  .note {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
</style>
