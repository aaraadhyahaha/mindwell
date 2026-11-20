// SPA: no SSR. adapter-static with a fallback page serves every route from the one page.
// GitHub Pages serves 404.html for unknown paths, so deep links load the SPA.
// The site lives under /mindwell on GitHub Pages; dev is served from the root. Override with BASE_PATH.
// See: https://svelte.dev/docs/kit/single-page-apps
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { copyFileSync } from "node:fs";

const staticAdapter = adapter({ fallback: "404.html" });

/**
 * adapter-static, plus index.html as a copy of the fallback. Without it GitHub Pages answers
 * the app's root with status 404 (it still shows 404.html), which breaks PWA install checks.
 * @type {import('@sveltejs/kit').Adapter}
 */
const pagesAdapter = {
  name: staticAdapter.name,
  async adapt(builder) {
    await staticAdapter.adapt(builder);
    copyFileSync("build/404.html", "build/index.html");
  },
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: pagesAdapter,
    paths: {
      base: process.argv.includes("dev") ? "" : (process.env.BASE_PATH ?? "/mindwell"),
      relative: false, // the fallback page is served at any depth, so asset URLs must be absolute
    },
  },
};

export default config;
