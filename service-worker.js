// ===== SERVICE WORKER FOR ROAD RAGE 2D - ULTIMATE OFFLINE =====
const CACHE_NAME = 'road-rage-complete-v1.0';
const OFFLINE_URL = 'offline.html';

// COMPLETE LIST OF ALL GAME ASSETS (use relative paths)
const ALL_GAME_ASSETS = [
  // HTML Files
  './',
  'index.html',
  'offline.html',
  
  // ALL CAR IMAGES
  'imahe/image1.png',
  'imahe/image2.png',
  'imahe/image3.png',
  'imahe/image4.png',
  'imahe/image5.png',
  'imahe/image6.png',
  'imahe/image7.png',
  'imahe/image8.png',
  'imahe/image9.png',
  
  // ALL MUSIC FILES (ESSENTIAL FOR OFFLINE)
  'music/ms1.m4a',
  'music/ms2.m4a',
  'music/ms3.m4a',
  'music/ms4.m4a',
  'music/ms5.m4a',
  
  // MANIFEST AND ICONS
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// ===== INSTALL: CACHE EVERYTHING AGGRESSIVELY =====
self.addEventListener('install', event => {
  console.log('🔄 [SW] Installing complete game package...');
  
  event.waitUntil(
    (async () => {
      // Open cache
      const cache = await caches.open(CACHE_NAME);
      console.log('📦 [SW] Cache opened, starting download...');
      
      // Show progress
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
            let lastError = null;
            
            for (let attempt = 0; attempt < 3 && !success; attempt++) {
              try {
                // Use 'no-cors' for audio files (less strict)
                const response = await fetch(asset, { 
                  mode: 'no-cors',
                  cache: 'force-cache'
                });
                
                if (response && response.type === 'opaque') {
                  // opaque response is OK for audio
                  await cache.put(asset, response);
                  success = true;
                  console.log(`✅ [SW] Audio cached (attempt ${attempt + 1}): ${asset}`);
                }
              } catch (err) {
                lastError = err;
                console.warn(`⚠️ [SW] Attempt ${attempt + 1} failed for: ${asset}`, err);
                
                // Wait before retry
                if (attempt < 2) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            }
            
            if (!success) {
              console.error(`❌ [SW] Failed to cache audio after 3 attempts: ${asset}`, lastError);
            }
          } else {
            // For non-audio files
            try {
              await cache.add(asset);
              console.log(`✅ [SW] Cached: ${asset}`);
            } catch (err) {
              console.warn(`⚠️ [SW] Failed: ${asset}`, err);
              
              // Try alternative method for problematic files
              try {
                const response = await fetch(asset);
                if (response.ok) {
                  await cache.put(asset, response);
                  console.log(`✅ [SW] Cached via fallback: ${asset}`);
                }
              } catch (fetchErr) {
                console.error(`💥 [SW] Critical error caching ${asset}:`, fetchErr);
              }
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
          console.error(`💥 [SW] Unexpected error caching ${asset}:`, error);
        }
      }
      
      console.log(`🎉 [SW] Installation complete! ${downloaded}/${total} assets cached`);
      
      // Force activation
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
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') return;
  
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
        
        // If not in cache, try network
        try {
          const networkResponse = await fetch(event.request);
          
          // Cache for next time
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
            console.log(`💾 [SW] Cached new audio: ${url.pathname}`);
          }
          
          return networkResponse;
        } catch (error) {
          console.log(`📴 [SW] Audio offline: ${url.pathname}`);
          // Return placeholder audio response
          return new Response('', {
            status: 200,
            headers: { 
              'Content-Type': 'audio/mp4',
              'Cache-Control': 'no-cache'
            }
          });
        }
      })()
    );
    return;
  }
  
  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first for navigation
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // If offline, try cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If not in cache, show offline page
          return caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }
  
  // For all other resources (CSS, JS, images, etc.)
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
        if (networkResponse.ok && 
            networkResponse.status === 200 && 
            networkResponse.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // For images, return a fallback
        if (event.request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#333"/></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        
        // For other files, return 404
        return new Response('Resource not available offline', { 
          status: 404,
          statusText: 'Not Found'
        });
      }
    })()
  );
});

// ===== MESSAGE HANDLER FOR CACHE STATUS =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_CACHE') {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const keys = await cache.keys();
          const audioKeys = keys.filter(key => 
            key.url.includes('.m4a') || 
            key.url.includes('/music/')
          );
          const imageKeys = keys.filter(key => 
            key.url.includes('.png') || 
            key.url.includes('/imahe/')
          );
          
          event.ports[0].postMessage({
            type: 'CACHE_STATUS',
            total: keys.length,
            audio: audioKeys.length,
            images: imageKeys.length,
            ready: audioKeys.length >= 5 && imageKeys.length >= 9
          });
        } catch (error) {
          console.error('[SW] Cache check failed:', error);
          event.ports[0].postMessage({
            type: 'CACHE_STATUS',
            error: error.message
          });
        }
      })()
    );
  }
});

// ===== BACKGROUND SYNC (optional enhancement) =====
self.addEventListener('sync', event => {
  if (event.tag === 'update-cache') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          // Update important files in background
          const importantFiles = ['index.html', 'manifest.json'];
          
          for (const file of importantFiles) {
            try {
              const response = await fetch(file);
              if (response.ok) {
                await cache.put(file, response);
                console.log(`[SW] Updated in background: ${file}`);
              }
            } catch (err) {
              console.warn(`[SW] Failed to update: ${file}`, err);
            }
          }
        } catch (error) {
          console.error('[SW] Background sync failed:', error);
        }
      })()
    );
  }
});
