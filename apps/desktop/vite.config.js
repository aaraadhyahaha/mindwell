import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

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

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
