<script lang="ts">
  import { Page, SectionLabel, Field, Choice, Button } from '@mindwell/ui';
  import type { ThemePreference } from '@mindwell/ui';
  import { settings } from '$lib/settings.svelte';
  import { activation } from '$lib/activation.svelte';
  import { capture, captureInfo, saveShortcut } from '$lib/capture.svelte';
  import type { CaptureInfo } from '$lib/capture.svelte';
  import { exportRecords } from '$lib/export';
  import type { ExportFormat } from '$lib/export';

  const onOff = [
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' }
  ];
  const themes = [
    { value: 'system', label: 'System' },
    { value: 'day', label: 'Day' },
    { value: 'night', label: 'Night' }
  ];
  const isTheme = (v: unknown): v is ThemePreference => v === 'system' || v === 'day' || v === 'night';
  const uid = $props.id();

  const ch01Active = $derived(activation.active.some((m) => m.manifest.id === 'ch01'));
  let info = $state<CaptureInfo | null>(null);
  $effect(() => {
    void captureInfo().then((i) => (info = i));
  });

  let exporting = $state(false);
  let exportMsg = $state('');

  async function runExport(format: ExportFormat) {
    exporting = true;
    exportMsg = '';
    const r = await exportRecords(format);
    exporting = false;
    if (r.status === 'saved') exportMsg = `Saved to ${r.path}.`;
    else if (r.status === 'unavailable') exportMsg = 'Export works in the desktop app.';
    else if (r.status === 'error') exportMsg = 'Could not export. Please try again.';
  }
</script>

<Page label="SETTINGS" title="Settings">
  {#if settings.error}<p class="note" role="alert">{settings.error}</p>{/if}

  <section aria-labelledby="s-name">
    <SectionLabel as="h2"><span id="s-name">Name</span></SectionLabel>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div onfocusout={() => void settings.saveName()}>
      <Field label="Your name" bind:value={settings.name} hint="Some prompts use your name." />
    </div>
  </section>

  <section aria-labelledby="s-rem">
    <SectionLabel as="h2"><span id="s-rem">Reminders</span></SectionLabel>
    <p class="muted">
      A quiet notification while mindwell is open or in the tray. Closing the window keeps it in the tray.
    </p>
    <div class="reminder">
      <div class="time">
        <label for="{uid}-m">Morning check-in</label>
        <input id="{uid}-m" type="time" bind:value={settings.morning} onchange={() => void settings.saveMorning()} />
      </div>
      <Choice
        label="Morning reminder"
        options={onOff}
        bind:value={() => (settings.morningOn ? 'on' : 'off'), (v) => void settings.setMorningOn(v === 'on')}
      />
    </div>
    <div class="reminder">
      <div class="time">
        <label for="{uid}-e">Evening close</label>
        <input id="{uid}-e" type="time" bind:value={settings.evening} onchange={() => void settings.saveEvening()} />
      </div>
      <Choice
        label="Evening reminder"
        options={onOff}
        bind:value={() => (settings.eveningOn ? 'on' : 'off'), (v) => void settings.setEveningOn(v === 'on')}
      />
    </div>
  </section>

  <section aria-labelledby="s-cap">
    <SectionLabel as="h2"><span id="s-cap">Capture shortcut</span></SectionLabel>
    {#if !ch01Active}
      <p class="muted">The capture shortcut arrives when Chapter 1 is marked read.</p>
    {:else}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div onfocusout={() => void saveShortcut(capture.shortcut)}>
        <Field
          label="Shortcut"
          bind:value={capture.shortcut}
          hint="Opens a small capture window from anywhere. Format: Super+Shift+N."
        />
      </div>
      {#if capture.error}<p class="note" role="alert">{capture.error}</p>{/if}
      {#if info}
        <p class="muted">From a compositor or launcher, run:</p>
        <p><code>{info.command}</code></p>
        {#if info.wayland}
          <p class="muted">
            Global shortcuts usually don't fire on Wayland. Bind this in your compositor instead, for example
            Hyprland: <code>bind = SUPER SHIFT, N, exec, {info.command}</code>
          </p>
        {/if}
      {/if}
    {/if}
  </section>

  <section aria-labelledby="s-theme">
    <SectionLabel as="h2"><span id="s-theme">Theme</span></SectionLabel>
    <Choice
      label="Appearance"
      options={themes}
      bind:value={() => settings.theme, (v) => isTheme(v) && void settings.setThemePref(v)}
    />
  </section>

  <section aria-labelledby="s-rec">
    <SectionLabel as="h2"><span id="s-rec">Your records</span></SectionLabel>
    <p class="muted">
      Everything you've recorded, as a file you keep. Markdown is easy to read; JSON is complete, including deleted
      records.
    </p>
    <div class="actions">
      <Button variant="secondary" disabled={exporting} onclick={() => void runExport('md')}>Export as Markdown</Button>
      <Button variant="secondary" disabled={exporting} onclick={() => void runExport('json')}>Export as JSON</Button>
    </div>
    {#if exportMsg}<p class="muted" role="status">{exportMsg}</p>{/if}
  </section>
</Page>

<style>
  section {
    margin-bottom: var(--space-7);
  }
  section > :global(:not(:first-child)) {
    margin-top: var(--space-4);
  }
  .muted,
  .note {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  code {
    font-family: var(--font-mono, monospace);
    font-size: var(--text-14);
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  .reminder {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-5);
  }
  .time {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  label {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
  }
  input {
    font-family: var(--font-serif);
    font-size: var(--text-16);
    line-height: var(--leading-body);
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-3);
    transition: border-color var(--motion-fast) var(--ease);
  }
  input:hover {
    border-color: var(--muted);
  }
</style>
