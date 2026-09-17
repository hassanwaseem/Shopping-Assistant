const CACHE = 'meal-planner-v19';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=19',
  './recipe-styles.css?v=19',
  './planner-engine.js?v=19',
  './data/pakistani-recipes.json',
  './data/pakistani-recipes-adapter.js?v=19',
  './app/app-core.js?v=19',
  './app/app-views-primary.js?v=19',
  './app/app-views-cook.js?v=19',
  './app/app-views-lists.js?v=19',
  './app/app-views-recipes.js?v=19',
  './app/app-domain.js?v=19',
  './app/end-user-polish.js?v=19',
  './app/app-main.js?v=19',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))),
  );
});
