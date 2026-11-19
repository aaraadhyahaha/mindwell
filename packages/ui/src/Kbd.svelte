<script lang="ts">
  /** A keyboard shortcut, e.g. `Super+Shift+N` shown as "Super Shift N". */
  let { keys }: { keys: string } = $props();
  const label = $derived(keys.split('+').map((k) => k.trim()).filter(Boolean).join(' '));
</script>

<kbd>{label}</kbd>

<style>
  kbd {
    font: 500 11.5px/1 var(--font-sans);
    color: var(--muted);
    border: 1px solid var(--rule);
    border-radius: 5px;
    padding: 4px 6px;
    background: var(--bg);
  }
</style>
