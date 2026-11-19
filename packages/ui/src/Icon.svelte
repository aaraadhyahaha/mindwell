<script lang="ts" module>
  /** Stroke icons from the approved mockups (24 × 24 grid). */
  const PATHS = {
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    week: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    experiments: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    thoughts: '<path d="M20 12a7.5 7 0 0 1-11 6.2L4 20l1.6-4.2A7 7 0 1 1 20 12Z"/>',
    records: '<path d="M12 4v16M8 20h8M4 7h16"/><path d="M6.5 7 3.5 13.5a3 3 0 0 0 6 0Z"/><path d="M17.5 7l-3 6.5a3 3 0 0 0 6 0Z"/>',
    library: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cross: '<path d="M6 6l12 12M18 6 6 18"/>',
    another: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    dot: '<circle cx="12" cy="12" r="3.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  } as const;

  export type IconName = keyof typeof PATHS;

  export function isIconName(name: string | undefined): name is IconName {
    return name !== undefined && name in PATHS;
  }
</script>

<script lang="ts">
  /** Decorative stroke icon; size and stroke width come from the parent's CSS (`svg` selector). */
  let { name }: { name: IconName | string | undefined } = $props();
  const body = $derived(PATHS[isIconName(name) ? name : 'dot']);
</script>

<svg aria-hidden="true" viewBox="0 0 24 24">{@html body}</svg>
