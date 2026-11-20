// SPA: no SSR. adapter-static with a fallback page serves every route from the one page.
// GitHub Pages serves 404.html for unknown paths, so deep links load the SPA.
// The site lives under /mindwell on GitHub Pages; dev is served from the root. Override with BASE_PATH.
// See: https://svelte.dev/docs/kit/single-page-apps
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: "404.html",
    }),
    paths: {
      base: process.argv.includes("dev") ? "" : (process.env.BASE_PATH ?? "/mindwell"),
      relative: false, // the fallback page is served at any depth, so asset URLs must be absolute
    },
  },
};

export default config;
