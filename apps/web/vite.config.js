import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { fileURLToPath } from "node:url";

/**
 * Release guard: the dev test module is registered only when `import.meta.env.DEV`
 * (see src/lib/registry.ts). Fails a production build if any of its files reach a chunk.
 */
/** @returns {import("vite").Plugin} */
function noDevModuleInRelease() {
  return {
    name: "mindwell:no-dev-module-in-release",
    apply: "build",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        const leaked = Object.entries(chunk.modules)
          .filter(([id, info]) => id.includes("/packages/modules/dev-test/") && info.renderedLength > 0)
          .map(([id]) => id);
        if (leaked.length > 0) {
          this.error(`Dev test module in release chunk ${chunk.fileName}: ${leaked.join(", ")}`);
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [sveltekit(), noDevModuleInRelease()],

  server: {
    port: 5173,
    strictPort: true,
    // SvelteKit narrows the dev server's file access to this app. Workspace packages are
    // consumed as source, and their assets (the bundled fonts in packages/ui) are fetched
    // by URL, so allow packages/ too; without it every font 403s and falls back to the system.
    fs: {
      allow: [fileURLToPath(new URL("../../packages", import.meta.url))],
    },
  },
  preview: { port: 4173, strictPort: true },
  // The SQLite WASM build loads its .wasm by URL relative to itself; pre-bundling breaks that.
  optimizeDeps: { exclude: ["@sqlite.org/sqlite-wasm"] },
  // The database worker (packages/storage-sqlite/src/browser/worker.ts) uses ES imports.
  worker: { format: /** @type {const} */ ("es") },
}));
