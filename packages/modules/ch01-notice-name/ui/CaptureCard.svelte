<script lang="ts">
  import type { ModuleViewProps, SettingRecord } from '@mindwell/core';
  import { Card } from '@mindwell/ui';

  let { store }: ModuleViewProps = $props();
  const DEFAULT = 'Super+Shift+N';
  let accelerator = $state(DEFAULT);

  $effect(() => {
    void (async () => {
      try {
        const [row] = await store.list<SettingRecord>('settings', { where: { key: 'capture.shortcut' }, limit: 1 });
        const v: unknown = row ? JSON.parse(row.value) : null;
        accelerator = typeof v === 'string' && v.trim() ? v : DEFAULT;
      } catch {
        accelerator = DEFAULT;
      }
    })();
  });
</script>

<Card>
  <a class="btn" href="/m/ch01/capture">Capture a thought</a>
  <p class="muted">Shortcut: {accelerator}</p>
</Card>

<style>
  .btn {
    display: inline-block;
    font-family: var(--font-sans);
    font-size: var(--text-14);
    line-height: var(--leading-body);
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--ink);
    border-radius: var(--radius);
    color: var(--ink);
    text-decoration: none;
  }
  .btn:hover {
    background: var(--accent-soft);
  }
  .muted {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    color: var(--muted);
    margin-top: var(--space-2);
  }
</style>
