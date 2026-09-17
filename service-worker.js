const CACHE = 'meal-planner-v20';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=20',
  './recipe-styles.css?v=20',
  './planner-engine.js?v=20',
  './data/pakistani-recipes.json',
  './data/pakistani-recipes-adapter.js?v=20',
  './app/app-core.js?v=20',
  './app/app-views-primary.js?v=20',
  './app/app-views-cook.js?v=20',
  './app/app-views-lists.js?v=20',
  './app/app-views-recipes.js?v=20',
  './app/app-domain.js?v=20',
  './app/end-user-polish.js?v=20',
  './app/app-main.js?v=20',
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
