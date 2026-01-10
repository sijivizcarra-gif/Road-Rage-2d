// ===== SERVICE WORKER FOR ROAD RAGE 2D - ULTIMATE OFFLINE =====
const CACHE_NAME = 'road-rage-complete-v1.0';
const OFFLINE_URL = '/Road-Rage-2d/offline.html';

// COMPLETE LIST OF ALL GAME ASSETS
const ALL_GAME_ASSETS = [
  // HTML Files
  '/Road-Rage-2d/',
  '/Road-Rage-2d/index.html',
  '/Road-Rage-2d/offline.html',
  
  // ALL CAR IMAGES
  '/Road-Rage-2d/imahe/image1.png',
  '/Road-Rage-2d/imahe/image2.png',
  '/Road-Rage-2d/imahe/image3.png',
  '/Road-Rage-2d/imahe/image4.png',
  '/Road-Rage-2d/imahe/image5.png',
  '/Road-Rage-2d/imahe/image6.png',
  '/Road-Rage-2d/imahe/image7.png',
  '/Road-Rage-2d/imahe/image8.png',
  '/Road-Rage-2d/imahe/image9.png',
  
  // ALL MUSIC FILES (ESSENTIAL FOR OFFLINE)
  '/Road-Rage-2d/music/ms1.m4a',
  '/Road-Rage-2d/music/ms2.m4a',
  '/Road-Rage-2d/music/ms3.m4a',
  '/Road-Rage-2d/music/ms4.m4a',
  '/Road-Rage-2d/music/ms5.m4a',
  
  // MANIFEST AND ICONS
  '/Road-Rage-2d/manifest.json',
  '/Road-Rage-2d/icons/icon-192.png',
  '/Road-Rage-2d/icons/icon-512.png',
  
  // JAVASCRIPT (if you have separate JS files)
  '/Road-Rage-2d/game.js' // if exists
];

// ===== INSTALL: CACHE EVERYTHING AGGRESSIVELY =====
self.addEventListener('install', event => {
  console.log('🔄 [SW] Installing complete game package...');
  
  event.waitUntil(
    (async () => {
      // Open cache
      const cache = await caches.open(CACHE_NAME);
      console.log('📦 [SW] Cache opened, starting download...');
      
      // Show progress (optional)
      let downloaded = 0;
      const total = ALL_GAME_ASSETS.length;
      
      // Cache ALL assets with retry logic
      for (const asset of ALL_GAME_ASSETS) {
        try {
          console.log(`⬇️ [SW] Downloading: ${asset}`);
          
          // For audio files, use special handling
          if (asset.includes('.m4a')) {
            // Try multiple times for audio files
            let success = false;
            for (let attempt = 0; attempt < 3 && !success; attempt++) {
              try {
                const response = await fetch(asset, { 
                  mode: 'cors',
                  cache: 'force-cache'
                });
                
                if (response.ok) {
                  await cache.put(asset, response);
                  success = true;
                  console.log(`✅ [SW] Audio cached (attempt ${attempt + 1}): ${asset}`);
                }
              } catch (err) {
                console.warn(`⚠️ [SW] Attempt ${attempt + 1} failed for: ${asset}`);
              }
            }
            
            if (!success) {
              console.error(`❌ [SW] Failed to cache: ${asset}`);
            }
          } else {
            // For non-audio files
            try {
              await cache.add(asset);
              console.log(`✅ [SW] Cached: ${asset}`);
            } catch (err) {
              console.warn(`⚠️ [SW] Failed: ${asset}`, err);
            }
          }
          
          downloaded++;
          
          // Send progress to client
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'CACHE_PROGRESS',
                progress: Math.round((downloaded / total) * 100),
                current: asset,
                downloaded: downloaded,
                total: total
              });
            });
          });
          
        } catch (error) {
          console.error(`💥 [SW] Critical error caching ${asset}:`, error);
        }
      }
      
      console.log(`🎉 [SW] Installation complete! ${downloaded}/${total} assets cached`);
      return self.skipWaiting();
    })()
  );
});

// ===== ACTIVATE: CLEAN OLD CACHES =====
self.addEventListener('activate', event => {
  console.log('🚀 [SW] Activating new version...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ [SW] Removing old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ [SW] Ready to serve offline content!');
      return self.clients.claim();
    })
  );
});

// ===== FETCH: OFFLINE-FIRST STRATEGY =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Special handling for audio files
  if (url.pathname.endsWith('.m4a')) {
    event.respondWith(
      (async () => {
        // Try cache first
        const cached = await caches.match(event.request);
        if (cached) {
          console.log(`🎵 [SW] Serving cached audio: ${url.pathname}`);
          return cached;
        }
        
        // If not in cache, try network but don't wait
        try {
          const networkResponse = await fetch(event.request);
          
          // Cache for next time
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
          console.log(`💾 [SW] Cached new audio: ${url.pathname}`);
          
          return networkResponse;
        } catch (error) {
          console.log(`📴 [SW] Audio offline: ${url.pathname}`);
          // Return empty audio response
          return new Response('', {
            status: 200,
            headers: { 'Content-Type': 'audio/mp4' }
          });
        }
      })()
    );
    return;
  }
  
  // For all other resources
  event.respondWith(
    (async () => {
      // Try cache first (OFFLINE-FIRST)
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If not in cache, try network
      try {
        const networkResponse = await fetch(event.request);
        
        // Cache successful responses
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // If offline and HTML page requested
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        
        // For images, return a fallback
        if (event.request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#333"/></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        
        // For other files, return empty response
        return new Response('', { status: 404 });
      }
    })()
  );
});

// ===== MESSAGE HANDLER FOR CACHE STATUS =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_CACHE') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        const audioKeys = keys.filter(key => key.url.includes('.m4a'));
        
        event.ports[0].postMessage({
          type: 'CACHE_STATUS',
          total: keys.length,
          audio: audioKeys.length,
          ready: audioKeys.length >= 5 // At least 5 audio files
        });
      })()
    );
  }
});
