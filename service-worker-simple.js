// Simple Service Worker for caching
const CACHE_NAME = 'road-rage-simple-v1';
const CACHE_FILES = [
  '/Road-Rage-2d/',
  '/Road-Rage-2d/index.html',
  '/Road-Rage-2d/game.js',
  '/Road-Rage-2d/manifest.json',
  '/Road-Rage-2d/icons/icon-192.png',
  '/Road-Rage-2d/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
