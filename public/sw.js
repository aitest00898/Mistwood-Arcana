const CACHE_NAME = 'mistwood-arcana-shell-v9-fullscreen-art';
const APP_BASE = new URL('./', self.registration.scope).href;
const APP_SHELL = [
  APP_BASE,
  new URL('manifest.webmanifest', APP_BASE).href,
  new URL('pwa/icon.svg', APP_BASE).href,
  new URL('pwa/icon-192.png', APP_BASE).href,
  new URL('pwa/icon-512.png', APP_BASE).href,
  new URL('assets/forest-atmosphere.png', APP_BASE).href,
  new URL('assets/characters/aether-mage/directional-atlas.png', APP_BASE).href,
  new URL('assets/characters/holy-spellblade/directional-atlas.png', APP_BASE).href,
  new URL('assets/characters/mistwood-ranger/directional-atlas.png', APP_BASE).href,
  new URL('assets/enemies/enemy-atlas.png', APP_BASE).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
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
