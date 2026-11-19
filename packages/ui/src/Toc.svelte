<script lang="ts" module>
  export interface TocEntry {
    href: string;
    /** "·" for the Introduction, else the chapter number. */
    number: string;
    title: string;
    read: boolean;
    current?: boolean;
  }
</script>

<script lang="ts">
  /** The book's table of contents under Library. A dot marks a chapter read. */
  let { entries }: { entries: TocEntry[] } = $props();
</script>

<ul class="toc">
  {#each entries as e (e.href)}
    <li>
      <a class:read={e.read} href={e.href} aria-current={e.current ? 'page' : undefined}
        ><i>{e.number}</i>{e.title}{#if e.read}<span class="sr">, read</span>{/if}</a
      >
    </li>
  {/each}
</ul>

<style>
  .toc {
    list-style: none;
    margin: 2px 0 0;
    padding: 0;
  }
  .toc a {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 4px 12px;
    font-size: 13.5px;
    color: var(--muted);
    text-decoration: none;
    border-radius: 6px;
  }
  .toc a:hover {
    color: var(--ink);
  }
  .toc a i {
    font-family: var(--font-serif);
    font-style: normal;
    width: 18px;
    text-align: right;
    font-size: 13px;
    flex: none;
  }
  .toc a.read {
    color: var(--ink);
  }
  .toc a.read::after {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    margin-left: auto;
    align-self: center;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
