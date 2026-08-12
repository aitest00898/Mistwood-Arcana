const CACHE_NAME = 'mistwood-arcana-shell-v13-performance-assets';
const APP_BASE = new URL('./', self.registration.scope).href;
const APP_SHELL = [
  APP_BASE,
  new URL('manifest.webmanifest', APP_BASE).href,
  new URL('pwa/icon.svg', APP_BASE).href,
  new URL('pwa/icon-192.png', APP_BASE).href,
  new URL('pwa/icon-512.png', APP_BASE).href,
  new URL('assets/forest-atmosphere.webp', APP_BASE).href,
  new URL('assets/characters/aether-mage/directional-atlas.webp', APP_BASE).href,
  new URL('assets/characters/holy-spellblade/directional-atlas.webp', APP_BASE).href,
  new URL('assets/characters/mistwood-ranger/directional-atlas.webp', APP_BASE).href,
  new URL('assets/characters/selection/aether-mage.webp', APP_BASE).href,
  new URL('assets/characters/selection/holy-spellblade.webp', APP_BASE).href,
  new URL('assets/characters/selection/mistwood-ranger.webp', APP_BASE).href,
  new URL('assets/enemies/enemy-atlas.webp', APP_BASE).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.all(
    APP_SHELL.map((url) => cache.add(url).catch(() => undefined)),
  )).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(async () => {
        // If this worker replaces the stale worker in an installed PWA, reload
        // an already-open Mistwood tab once so it immediately receives the new
        // HTML and hashed bundle instead of remaining on the old boot screen.
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        await Promise.all(clients
          .filter((client) => client.url.startsWith(APP_BASE))
          .map((client) => client.navigate(client.url)));
      }),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // HTML is the version boundary for the hashed JavaScript/CSS bundle. Always
  // prefer the network for navigations so an installed PWA cannot keep an old
  // boot screen after a Pages deployment. Offline fallback still uses the
  // cached shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(APP_BASE, copy));
        }
        return response;
      }).catch(() => caches.match(APP_BASE)),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(APP_BASE));
    }),
  );
});
