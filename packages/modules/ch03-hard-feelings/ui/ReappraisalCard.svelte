<script lang="ts">
  import type { ModuleViewProps } from '@mindwell/core';
  import { Card } from '@mindwell/ui';
  import { PRE_EVENT_MIN } from '../reminders';
  import { clock, eventToday } from '../signals';

  let { signals }: ModuleViewProps = $props();
  const ev = $derived(eventToday(signals));
  const soon = $derived(ev ? Date.parse(ev.starts_at) - Date.now() <= PRE_EVENT_MIN * 60_000 : false);
</script>

{#if ev}
  <Card>
    <p class="label">{soon ? 'Within the hour' : 'Today'} · {clock(ev.starts_at)}</p>
    <p class="title">{ev.title}</p>
    <p class="say">Your body is getting ready to perform. Say: <i>I'm excited.</i></p>
    <p class="muted">A racing heart and quick breath are the same signals as excitement. Name them that way.</p>
    <a class="link" href="/m/ch03?tab=events">Events</a>
  </Card>
{/if}

<style>
  .label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 0;
  }
  .title {
    font-family: var(--font-serif);
    font-size: 17px;
    margin: 6px 0 0;
  }
  .say {
    font-family: var(--font-serif);
    font-size: 20px;
    line-height: 1.4;
    margin: 12px 0 0;
  }
  .say i {
    color: var(--accent);
  }
  .muted {
    font-size: var(--text-14);
    color: var(--muted);
    margin: 8px 0 0;
  }
  .link {
    display: inline-flex;
    margin-top: var(--space-3);
    font: 600 12.5px var(--font-sans);
    color: var(--accent);
    text-decoration: none;
  }
  .link:hover {
    text-decoration: underline;
  }
</style>
