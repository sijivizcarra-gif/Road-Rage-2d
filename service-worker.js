// ===== SERVICE WORKER FOR ROAD RAGE 2D =====
const CACHE_NAME = 'road-rage-offline-v1.0';
const OFFLINE_URL = 'offline.html';

// LIST ALL YOUR GAME FILES HERE
const APP_ASSETS = [
  // Main files
  './',
  './index.html',
  
  // All your car images - ADD ALL 9 IMAGES
  './imahe/image1.png',
  './imahe/image2.png',
  './imahe/image3.png',
  './imahe/image4.png',
  './imahe/image5.png',
  './imahe/image6.png',
  './imahe/image7.png',
  './imahe/image8.png',
  './imahe/image9.png',
  
  // All your music files - ADD ALL 5 TRACKS
  './music/ms1.mp3',
  './music/ms2.mp3',
  './music/ms3.mp3',
  './music/ms4.mp3',
  './music/ms5.mp3',
  
  // Manifest and icons
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// INSTALL: Cache all game assets
self.addEventListener('install', event => {
  console.log('[SW] Installing and caching game files...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching game assets');
        return cache.addAll(APP_ASSETS);
      })
      .then(() => {
        console.log('[SW] All assets cached');
        return self.skipWaiting();
      })
  );
});

// ACTIVATE: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH: Serve cached files when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Special handling for music - allow streaming
  if (event.request.url.includes('.mp3')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          return cached || fetch(event.request).then(response => {
            // Cache new music files
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return response;
          }).catch(() => {
            // If music fails, game can still work
            return new Response('', {status: 404});
          });
        })
    );
    return;
  }
  
  // For all other files
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            // Don't cache if not valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache the new file
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // If offline and HTML requested, show offline page
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Game asset not available offline');
          });
      })
  );
});
