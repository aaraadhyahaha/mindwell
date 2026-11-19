<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    open = $bindable(false),
    title,
    children
  }: { open?: boolean; title: string; children: Snippet } = $props();
  const uid = $props.id();

  let dialog: HTMLDialogElement | undefined = $state();
  let shown = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if (!dialog) return;
    clearTimeout(timer);
    if (open) {
      if (!dialog.open) dialog.showModal();
      requestAnimationFrame(() => (shown = true));
    } else if (dialog.open) {
      shown = false;
      timer = setTimeout(() => dialog?.close(), 150);
    }
    return () => clearTimeout(timer);
  });

  function oncancel(e: Event) {
    e.preventDefault();
    open = false;
  }
</script>

<dialog bind:this={dialog} aria-labelledby="{uid}-title" {oncancel} class:shown>
  <button type="button" class="scrim" tabindex="-1" aria-label="Close" onclick={() => (open = false)}></button>
  <div class="panel">
    <div class="top">
      <h2 id="{uid}-title">{title}</h2>
      <button type="button" class="close" onclick={() => (open = false)}>Close</button>
    </div>
    <div class="body">{@render children()}</div>
  </div>
</dialog>

<style>
  dialog {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    opacity: 0;
    transition: opacity var(--motion-fast) var(--ease);
  }
  dialog.shown {
    opacity: 1;
  }
  dialog::backdrop {
    background: transparent;
  }
  .scrim {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    padding: 0;
    cursor: default;
    background: color-mix(in srgb, var(--bg) 80%, transparent);
  }
  .panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(420px, 100%);
    background: var(--surface);
    border-left: 1px solid var(--rule);
    padding: var(--space-5);
    overflow-y: auto;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }
  h2 {
    font-family: var(--font-serif);
    font-size: var(--text-19);
  }
  .close {
    font-family: var(--font-sans);
    font-size: var(--text-14);
    background: transparent;
    border: 0;
    color: var(--ink);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
  }
  .close:hover {
    text-decoration: underline;
  }
  .body {
    font-family: var(--font-serif);
    font-size: var(--text-16);
    line-height: var(--leading-body);
  }
</style>
