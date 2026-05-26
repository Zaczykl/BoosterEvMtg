const CACHE_NAME = 'booster-ev-v1';

// Pliki lokalne do cache'owania (działają offline)
const LOCAL_FILES = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/api.js',
  '/js/calculator.js',
  '/js/categorizer.js',
  '/js/probability.js',
  '/js/ui.js',
  '/sets/bro-draft.json',
  '/sets/dft-play.json',
  '/sets/dsk-play.json',
  '/sets/mid-draft.json',
  '/sets/mkm-play.json',
  '/sets/snc-draft.json',
  '/sets/spm-play.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Domeny API — zawsze przez sieć, nigdy z cache
const API_DOMAINS = [
  'api.scryfall.com',
  'api.frankfurter.app',
  'cdn.jsdelivr.net'
];

// Instalacja: zapisz pliki lokalne w cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(LOCAL_FILES))
      .then(() => self.skipWaiting())
  );
});

// Aktywacja: usuń stare wersje cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: API zawsze przez sieć, reszta z cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Wywołania do Scryfall i kursów walut — zawsze przez sieć
  if (API_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Pliki lokalne — cache first, fallback sieć
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Zapisz nowe pliki w cache na przyszłość
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
