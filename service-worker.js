const CACHE = 'meal-planner-v10';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './recipe-styles.css',
  './planner-engine.js',
  './data/recipe-profiles-1.js',
  './data/recipe-profiles-2.js',
  './data/recipes.js',
  './data/recipe-expansion.js',
  './data/recipe-quality.js',
  './app/app-core.js',
  './app/app-views-primary.js',
  './app/app-views-lists.js',
  './app/app-views-recipes.js',
  './app/app-domain.js',
  './app/end-user-polish.js',
  './app/app-main.js',
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
