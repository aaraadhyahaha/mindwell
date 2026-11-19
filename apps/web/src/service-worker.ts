/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `mindwell-${version}`;
const PRECACHE = [...build, ...files, '/'];
const PRECACHED = new Set(PRECACHE);

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE);
      await sw.skipWaiting();
    })()
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key);
      }
      await sw.clients.claim();
    })()
  );
});

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== sw.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await (await caches.open(CACHE)).match('/');
          return cached ?? Response.error();
        }
      })()
    );
    return;
  }

  // The sqlite wasm is emitted by the worker build, so it is not in `build`. Its name is content-hashed,
  // so it is cached the first time it is fetched.
  if (url.pathname.startsWith('/_app/immutable/workers/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })()
    );
    return;
  }

  if (PRECACHED.has(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await (await caches.open(CACHE)).match(request);
        return cached ?? fetch(request);
      })()
    );
  }
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const mine = windows.find((c) => new URL(c.url).origin === sw.location.origin);
      if (mine) {
        await mine.focus();
        return;
      }
      await sw.clients.openWindow('/');
    })()
  );
});
