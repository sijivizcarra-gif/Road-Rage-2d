// ===== SERVICE WORKER FOR ROAD RAGE 2D PRO =====
const CACHE_NAME = 'road-rage-pro-v2.2';
const APP_ASSETS = [
  // Main files
  './index.html',
  './offline.html',
  './manifest.json',
  
  // All car images
  './imahe/image1.png',
  './imahe/image2.png',
  './imahe/image3.png',
  './imahe/image4.png',
  './imahe/image5.png',
  './imahe/image6.png',
  './imahe/image7.png',
  './imahe/image8.png',
  './imahe/image9.png',
  
  // All music files
  './music/ms1.m4a',
  './music/ms2.m4a',
  './music/ms3.m4a',
  './music/ms4.m4a',
  './music/ms5.m4a',
  
  // Icons (all sizes)
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', event => {
  console.log('🎮 [SW] Installing Road Rage 2D Pro...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 [SW] Caching game assets...');
        
        // Cache all assets with error handling
        const cachePromises = APP_ASSETS.map(asset => {
          return cache.add(asset).catch(err => {
            console.warn(`[SW] ⚠️ Could not cache: ${asset}`, err);
            return Promise.resolve(); // Continue even if some fail
          });
        });
        
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log(`✅ [SW] Successfully cached ${APP_ASSETS.length} game files`);
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ [SW] Installation failed:', err);
      })
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', event => {
  console.log('🔄 [SW] Activating new service worker...');
  
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
    })
    .then(() => {
      console.log('✅ [SW] Cleanup complete. Claiming clients...');
      return self.clients.claim();
    })
    .then(() => {
      // Notify all clients about activation
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            message: 'Service Worker activated! Game ready for offline play.',
            version: '2.2',
            timestamp: new Date().toISOString()
          });
        });
      });
    })
  );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip external requests and browser extensions
  if (!url.pathname.includes('/Road-Rage-2d/')) return;
  if (url.protocol === 'chrome-extension:') return;
  
  // ===== STRATEGY 1: HTML Navigation =====
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with fresh HTML
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline: try to serve from cache
          return caches.match('./index.html')
            .then(cached => {
              if (cached) {
                console.log('[SW] 📄 Serving cached index.html');
                return cached;
              }
              // Fallback to offline page
              return caches.match('./offline.html')
                .then(offline => offline || new Response(
                  '<h1>Road Rage 2D</h1><p>Game offline. Please connect to internet.</p>',
                  { headers: { 'Content-Type': 'text/html' } }
                ));
            });
        })
    );
    return;
  }
  
  // ===== STRATEGY 2: Game Assets (Images, Music) =====
  if (url.pathname.includes('imahe/') || url.pathname.includes('music/')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          // Return cached version if available
          if (cached) {
            console.log(`[SW] ✅ Serving cached: ${url.pathname.split('/').pop()}`);
            return cached;
          }
          
          // Not cached, fetch from network
          return fetch(event.request)
            .then(response => {
              // Cache successful responses
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                  console.log(`[SW] 💾 Cached new: ${url.pathname.split('/').pop()}`);
                });
              }
              return response;
            })
            .catch(error => {
              console.log(`[SW] ❌ Fetch failed: ${url.pathname}`);
              
              // Return appropriate fallback
              if (url.pathname.includes('imahe/')) {
                // Fallback car image
                return new Response(
                  `<svg width="50" height="90" xmlns="http://www.w3.org/2000/svg">
                    <rect width="50" height="90" fill="#faff00"/>
                    <text x="25" y="45" text-anchor="middle" fill="#000" font-size="12">CAR</text>
                  </svg>`,
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
              
              if (url.pathname.includes('music/')) {
                // Empty response for missing audio
                return new Response('', { 
                  status: 404,
                  headers: { 'Content-Type': 'audio/mp4' }
                });
              }
              
              throw error;
            });
        })
    );
    return;
  }
  
  // ===== STRATEGY 3: Icons and Manifest =====
  if (url.pathname.includes('icons/') || url.pathname.includes('manifest.json')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
    return;
  }
  
  // ===== STRATEGY 4: Default (Cache First) =====
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          return cached;
        }
        
        return fetch(event.request)
          .then(response => {
            // Cache successful responses
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(error => {
            console.log(`[SW] 🌐 Network error for: ${url.pathname}`);
            throw error;
          });
      })
  );
});

// ===== MESSAGE HANDLER =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_CACHE') {
    caches.open(CACHE_NAME).then(cache => {
      return cache.keys();
    }).then(keys => {
      const cacheInfo = {
        total: keys.length,
        images: keys.filter(k => k.url.includes('imahe/')).length,
        music: keys.filter(k => k.url.includes('music/')).length,
        html: keys.filter(k => k.url.includes('.html')).length,
        icons: keys.filter(k => k.url.includes('icons/')).length,
        version: '2.2',
        ready: false
      };
      
      cacheInfo.ready = cacheInfo.images >= 9 && cacheInfo.music >= 5;
      
      event.source.postMessage({
        type: 'CACHE_STATUS',
        data: cacheInfo
      });
    }).catch(err => {
      event.source.postMessage({
        type: 'CACHE_ERROR',
        error: err.message
      });
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(success => {
      event.source.postMessage({
        type: 'CACHE_CLEARED',
        success: success
      });
    });
  }
});

// ===== BACKGROUND SYNC (Optional) =====
self.addEventListener('sync', event => {
  if (event.tag === 'sync-game-data') {
    console.log('[SW] 🔄 Background sync triggered');
    event.waitUntil(syncGameData());
  }
});

async function syncGameData() {
  // You can implement game data syncing here
  console.log('[SW] 📊 Syncing game data...');
  return Promise.resolve();
}

// ===== PUSH NOTIFICATIONS (Optional) =====
self.addEventListener('push', event => {
  const options = {
    body: 'Road Rage 2D is ready to play!',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: './index.html'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Road Rage 2D', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === './index.html' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
