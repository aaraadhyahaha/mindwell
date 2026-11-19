// tsc can't read .svelte files; the app's svelte-check compiles them.
declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component<import('@mindwell/core').ModuleViewProps>;
  export default component;
}
