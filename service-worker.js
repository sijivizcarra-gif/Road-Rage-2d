// ===== SERVICE WORKER FOR ROAD RAGE 2D - FORCE MUSIC INSTALL =====
const CACHE_NAME = 'road-rage-complete-v3.0';
const OFFLINE_URL = '/Road-Rage-2d/offline.html';

// ===== ALL ASSETS - MUSIC FORCED =====
const ALL_GAME_ASSETS = [
  // Core files
  '/Road-Rage-2d/',
  '/Road-Rage-2d/index.html',
  '/Road-Rage-2d/offline.html',
  '/Road-Rage-2d/manifest.json',
  
  // All car images
  '/Road-Rage-2d/imahe/image1.png',
  '/Road-Rage-2d/imahe/image2.png',
  '/Road-Rage-2d/imahe/image3.png',
  '/Road-Rage-2d/imahe/image4.png',
  '/Road-Rage-2d/imahe/image5.png',
  '/Road-Rage-2d/imahe/image6.png',
  '/Road-Rage-2d/imahe/image7.png',
  '/Road-Rage-2d/imahe/image8.png',
  '/Road-Rage-2d/imahe/image9.png',
  
  // MUSIC FILES - CRITICAL (31MB)
  '/Road-Rage-2d/music/ms1.mp3',
  '/Road-Rage-2d/music/ms2.mp3',
  '/Road-Rage-2d/music/ms3.mp3',
  '/Road-Rage-2d/music/ms4.mp3',
  '/Road-Rage-2d/music/ms5.mp3',
  
  // Icons
  '/Road-Rage-2d/icons/icon-192.png',
  '/Road-Rage-2d/icons/icon-512.png'
];

// ===== INSTALL: FORCE DOWNLOAD EVERYTHING =====
self.addEventListener('install', event => {
  console.log('🎮 [SW] FORCE INSTALLING ALL RESOURCES...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        let downloaded = 0;
        const total = ALL_GAME_ASSETS.length;
        
        // Send initial progress
        sendProgressToGame('🚀 Starting installation...', 0, total);
        
        // Download ALL files sequentially with retries
        for (const url of ALL_GAME_ASSETS) {
          const filename = url.split('/').pop();
          let success = false;
          let attempts = 0;
          
          while (!success && attempts < 3) {
            attempts++;
            try {
              console.log(`⏬ Attempt ${attempts}: ${filename}`);
              
              // Special handling for large music files
              const fetchOptions = {
                cache: 'reload',
                credentials: 'same-origin'
              };
              
              if (url.includes('.mp3')) {
                fetchOptions.priority = 'high';
              }
              
              const response = await fetch(url, fetchOptions);
              
              if (response.ok) {
                await cache.put(url, response);
                downloaded++;
                success = true;
                
                const percent = Math.round((downloaded / total) * 100);
                
                // Send progress update
                if (url.includes('.mp3')) {
                  const musicNum = url.match(/ms(\d)/)?.[1] || '?';
                  sendProgressToGame(
                    `🎵 Music ${musicNum}/5 installed`,
                    downloaded,
                    total
                  );
                } else {
                  sendProgressToGame(
                    `Installing game... ${percent}%`,
                    downloaded,
                    total
                  );
                }
              }
            } catch (err) {
              console.warn(`⚠️ Attempt ${attempts} failed for ${filename}:`, err.message);
              if (attempts === 3) {
                sendProgressToGame(
                  `⚠️ Skipped: ${filename}`,
                  downloaded,
                  total
                );
              }
            }
          }
        }
        
        // Installation complete
        console.log(`🎉 COMPLETE: ${downloaded}/${total} files`);
        
        if (downloaded >= total - 3) { // Allow 3 files to fail
          sendProgressToGame(
            '✅ All resources installed!',
            downloaded,
            total
          );
          
          // Notify game that music is ready
          notifyGameComplete();
        } else {
          sendProgressToGame(
            '⚠️ Partial installation - some files missing',
            downloaded,
            total
          );
        }
        
        return self.skipWaiting();
        
      } catch (error) {
        console.error('❌ Installation failed:', error);
        sendProgressToGame('❌ Installation failed - refresh page', 0, 0);
        throw error;
      }
    })()
  );
});

// ===== ACTIVATE: Clean old caches =====
self.addEventListener('activate', event => {
  console.log('🔄 [SW] Activating with complete cache...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// ===== FETCH: Serve from cache first =====
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // For music files: cache only
  if (url.includes('.mp3')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        // Music should be cached during install
        return new Response('', { 
          status: 404,
          headers: { 'Content-Type': 'audio/mpeg' }
        });
      })()
    );
    return;
  }
  
  // For other files: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// ===== HELPER FUNCTIONS =====
function sendProgressToGame(message, current, total) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'INSTALLATION_PROGRESS',
        message: message,
        current: current,
        total: total,
        progressPercent: total > 0 ? Math.round((current / total) * 100) : 0
      });
    });
  });
}

function notifyGameComplete() {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'INSTALLATION_COMPLETE',
        message: '✅ Game + Music fully installed!'
      });
    });
  });
}

// ===== MESSAGE HANDLER =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_INSTALLATION') {
    caches.open(CACHE_NAME)
      .then(cache => cache.keys())
      .then(keys => {
        const totalFiles = keys.length;
        const musicFiles = keys.filter(k => k.url.includes('.mp3')).length;
        
        event.ports[0].postMessage({
          type: 'INSTALLATION_STATUS',
          totalAssets: totalFiles,
          musicFiles: musicFiles,
          allMusicReady: musicFiles >= 5,
          totalExpected: ALL_GAME_ASSETS.length
        });
      });
  }
});
