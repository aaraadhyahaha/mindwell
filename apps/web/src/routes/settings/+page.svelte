<script lang="ts">
  import { Page, SectionLabel, Field, Choice, Button, Toolbar, Kbd } from '@mindwell/ui';
  import type { ThemePreference } from '@mindwell/ui';
  import { onMount } from 'svelte';
  import { requestNotificationPermission } from '$lib/reminders.svelte';
  import { capture } from '$lib/capture.svelte';
  import { settings } from '$lib/settings.svelte';
  import { activation } from '$lib/activation.svelte';
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

  const origin = typeof location !== 'undefined' ? location.origin : '';

  let permission = $state<NotificationPermission | 'unsupported' | null>(null);
  onMount(() => {
    permission = 'Notification' in window ? Notification.permission : 'unsupported';
  });
  async function allow() {
    permission = await requestNotificationPermission();
  }

  let exporting = $state(false);
  let exportMsg = $state('');

  async function runExport(format: ExportFormat) {
    exporting = true;
    exportMsg = '';
    const r = await exportRecords(format);
    exporting = false;
    exportMsg = r.status === 'saved' ? `Downloaded ${r.filename}.` : 'Could not export. Please try again.';
  }
</script>

<Toolbar head="Settings" />
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
      A quiet notification while mindwell is open in a browser tab. If one is missed, it shows once when you come
      back to the tab.
    </p>
    {#if permission === 'default'}
      <div class="actions">
        <Button variant="secondary" onclick={() => void allow()}>Allow notifications</Button>
      </div>
    {:else if permission === 'denied'}
      <p class="muted">Notifications are blocked for this site. Allow them in your browser's site settings.</p>
    {:else if permission === 'unsupported'}
      <p class="muted">This browser can't show notifications.</p>
    {/if}
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
      <p class="muted">Press <Kbd keys={capture.shortcut} /> anywhere in mindwell to capture a thought.</p>
      <p class="muted">
        To capture from anywhere on your desktop, bind a key in your compositor or desktop settings to open the
        capture page. It opens in your browser, alongside any mindwell tab already open. Hyprland:
      </p>
      <p><code>bind = SUPER SHIFT, N, exec, xdg-open {origin}/#capture</code></p>
      <p class="muted">Other desktops: run <code>xdg-open {origin}/#capture</code> from a custom shortcut.</p>
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
      The file goes to your browser's downloads folder.
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
