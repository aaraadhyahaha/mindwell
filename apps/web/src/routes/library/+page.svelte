<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { BOOK_CHAPTERS, BOOK_PARTS } from '@mindwell/core';
  import { Opener, Button, Toolbar } from '@mindwell/ui';
  import { activation } from '$lib/activation.svelte';
  import { moduleRunningHead } from '$lib/nav';

  let error = $state<string | null>(null);
  let pending = $state(false);

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /** "19 November", plus the year when it isn't this year. */
  function readOn(day: string): string {
    const [y, m, d] = day.split('-').map(Number);
    const month = MONTHS[(m ?? 1) - 1] ?? '';
    return y === new Date().getFullYear() ? `${d} ${month}` : `${d} ${month} ${y}`;
  }

  const entries = $derived(activation.library);
  const readCount = $derived(entries.filter((e) => e.readDay && BOOK_CHAPTERS.some((c) => c.chapter === e.chapter)).length);

  /** `#chapter-2` selects chapter 2; otherwise the first unread chapter. */
  const selected = $derived.by(() => {
    const m = /^#chapter-(\d+)$/.exec(page.url.hash);
    const fromHash = m ? entries.find((e) => e.chapter === Number(m[1])) : undefined;
    return fromHash ?? entries.find((e) => !e.readDay) ?? entries[0] ?? null;
  });

  const partAt = (chapter: number) => BOOK_PARTS.find((p) => p.first === chapter);
  const number = (chapter: number) => (chapter === 0 ? '·' : String(chapter));
  const label = (chapter: number) => (chapter === 0 ? 'Introduction' : `Chapter ${chapter}`);
  const practice = (e: (typeof entries)[number]) => (e.module ? moduleRunningHead(e.module.manifest).sub : null);

  function status(e: (typeof entries)[number]): string {
    if (!e.readDay) return 'Unread';
    const p = practice(e);
    return p ? `Read · ${p} on` : 'Read';
  }

  async function toggle(chapter: number, read: boolean) {
    pending = true;
    error = null;
    try {
      await (read ? activation.markUnread(chapter) : activation.markRead(chapter));
    } catch {
      error = 'Could not save that change. Please try again.';
    } finally {
      pending = false;
    }
  }

  onMount(async () => {
    if (activation.loaded) return;
    try {
      await activation.load();
    } catch {
      error = 'The library could not be loaded.';
    }
  });
</script>

<Toolbar head="The book" sub="Clear Mind, Steady Work">
  {#snippet actions()}
    <span class="readcount">{readCount} of {BOOK_CHAPTERS.length} chapters read</span>
  {/snippet}
</Toolbar>

<div class="page">
  <section aria-label="Contents">
    <Opener
      label="Library"
      title="Contents"
      lede="Mark a chapter as read to turn on its practice. The app grows as you read."
      ruleBelow={8}
    />
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#each entries as e (e.chapter)}
      {@const part = partAt(e.chapter)}
      {#if part}<p class="part">{part.name} · {part.title}</p>{/if}
      <a
        class="entry"
        class:sel={selected?.chapter === e.chapter}
        class:unread={!e.readDay}
        href="#chapter-{e.chapter}"
        aria-current={selected?.chapter === e.chapter ? 'true' : undefined}
        ><span class="no">{number(e.chapter)}</span><span class="t">{e.title}</span><span class="lead"></span><span
          class="st"
          class:on={!!e.readDay}>{status(e)}</span
        ></a
      >
    {/each}
  </section>

  {#if selected}
    {@const m = selected.module?.manifest}
    <aside class="detail" aria-label={label(selected.chapter)}>
      <p class="label">{label(selected.chapter)}</p>
      <h2>{selected.title}</h2>
      {#if m}<p class="idea">{m.idea}</p>{/if}
      {#if m?.adds?.length}
        <h3>What it adds to mindwell</h3>
        <ul>
          {#each m.adds as line (line)}<li>{line}</li>{/each}
        </ul>
      {/if}
      {#if m}
        <h3>The evidence</h3>
        <p class="ev">{m.evidence}</p>
      {/if}
      {#if selected.readDay}
        <Button variant="secondary" disabled={pending} onclick={() => toggle(selected.chapter, true)}>Mark as unread</Button>
        <p class="note">Read on {readOn(selected.readDay)}. Nothing you've recorded is deleted.</p>
      {:else}
        <Button disabled={pending} onclick={() => toggle(selected.chapter, false)}>I've read this chapter</Button>
        <p class="note">
          {#if m}Turns on {practice(selected)}. You can turn it off later.{:else}Its practice comes in a later version.{/if}
        </p>
      {/if}
    </aside>
  {/if}
</div>

<style>
  .readcount {
    font-size: 13px;
    color: var(--muted);
  }
  .page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 72px;
    padding: 52px 64px 72px;
    max-width: 1188px;
    margin: 0 auto;
    width: 100%;
  }
  .label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 0;
  }
  .error {
    font-size: 13px;
    color: var(--muted);
    margin: 0 0 8px;
  }
  .part {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    margin: 30px 0 6px;
  }
  .entry {
    display: flex;
    align-items: baseline;
    gap: 14px;
    padding: 9px 10px;
    margin: 0 -10px;
    border-radius: 8px;
    text-decoration: none;
    color: var(--ink);
    transition: background-color var(--motion-fast) var(--ease);
  }
  .entry:hover:not(.sel) {
    background: color-mix(in srgb, var(--surface) 55%, transparent);
  }
  .no {
    font-family: var(--font-serif);
    width: 22px;
    text-align: right;
    color: var(--muted);
    flex: none;
  }
  .t {
    font-family: var(--font-serif);
    font-size: 18px;
    white-space: nowrap;
  }
  .lead {
    flex: 1;
    border-bottom: 1.5px dotted var(--leader);
    transform: translateY(-5px);
    min-width: 24px;
  }
  .st {
    font-size: 12.5px;
    color: var(--muted);
    white-space: nowrap;
  }
  .st.on {
    color: var(--accent);
    font-weight: 600;
  }
  .entry.sel {
    background: var(--surface);
    box-shadow: 0 0 0 1px var(--rule);
  }
  .entry.unread .t {
    color: var(--muted);
  }
  .detail {
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 12px;
    padding: 30px 28px;
    align-self: start;
    position: sticky;
    top: 24px;
  }
  .detail h2 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 27px;
    line-height: 1.2;
    margin: 8px 0 0;
  }
  .idea {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 16px;
    line-height: 1.5;
    margin: 14px 0 0;
    color: var(--ink);
  }
  .detail h3 {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
    line-height: 1.5;
    margin: 24px 0 8px;
  }
  .detail ul {
    margin: 0;
    padding-left: 18px;
    font-size: 14.5px;
  }
  .detail li {
    margin: 5px 0;
  }
  .ev {
    font-size: 13.5px;
    color: var(--muted);
    line-height: 1.55;
    margin: 0;
  }
  .detail :global(.btn) {
    width: 100%;
    justify-content: center;
    margin-top: 26px;
  }
  .note {
    font-size: 12.5px;
    color: var(--muted);
    text-align: center;
    margin: 10px 0 0;
  }
</style>
