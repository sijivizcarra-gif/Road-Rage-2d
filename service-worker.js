// ===== SERVICE WORKER FOR ROAD RAGE 2D =====
const CACHE_NAME = 'road-rage-music-v2.0';
const OFFLINE_URL = '/Road-Rage-2d/offline.html';

// ===== ALL GAME FILES (INCLUDING 31MB MUSIC) =====
const ALL_GAME_ASSETS = [
  // Core files
  '/Road-Rage-2d/',
  '/Road-Rage-2d/index.html',
  '/Road-Rage-2d/offline.html',
  '/Road-Rage-2d/manifest.json',
  
  // All 9 car images
  '/Road-Rage-2d/imahe/image1.png',
  '/Road-Rage-2d/imahe/image2.png',
  '/Road-Rage-2d/imahe/image3.png',
  '/Road-Rage-2d/imahe/image4.png',
  '/Road-Rage-2d/imahe/image5.png',
  '/Road-Rage-2d/imahe/image6.png',
  '/Road-Rage-2d/imahe/image7.png',
  '/Road-Rage-2d/imahe/image8.png',
  '/Road-Rage-2d/imahe/image9.png',
  
  // ALL 5 MUSIC TRACKS (31MB) - FORCED DOWNLOAD
  '/Road-Rage-2d/music/ms1.mp3',
  '/Road-Rage-2d/music/ms2.mp3',
  '/Road-Rage-2d/music/ms3.mp3',
  '/Road-Rage-2d/music/ms4.mp3',
  '/Road-Rage-2d/music/ms5.mp3',
  
  // App icons
  '/Road-Rage-2d/icons/icon-192.png',
  '/Road-Rage-2d/icons/icon-512.png'
];

// ===== INSTALL: FORCE DOWNLOAD ALL FILES INCLUDING MUSIC =====
self.addEventListener('install', event => {
  console.log('🎮 [SW] Installing ALL game packages (including 31MB music)...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        let downloadedCount = 0;
        const totalFiles = ALL_GAME_ASSETS.length;
        
        // Send initial progress
        sendProgressToGame('⏬ Installing game packages...', 0, totalFiles);
        
        // Download files ONE BY ONE with progress tracking
        for (const assetUrl of ALL_GAME_ASSETS) {
          try {
            console.log(`⏬ Downloading: ${assetUrl.split('/').pop()}`);
            
            // Fetch with 30-second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(assetUrl, {
              signal: controller.signal,
              cache: 'reload'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              await cache.put(assetUrl, response);
              downloadedCount++;
              
              // Update progress
              const progress = Math.round((downloadedCount / totalFiles) * 100);
              console.log(`✅ ${downloadedCount}/${totalFiles} (${progress}%): ${assetUrl.split('/').pop()}`);
              
              // Send progress to game UI
              sendProgressToGame(
                `Installing... ${progress}%`,
                downloadedCount,
                totalFiles
              );
              
              // Special message for music files
              if (assetUrl.includes('.mp3')) {
                const musicNum = assetUrl.match(/ms(\d)/)?.[1] || '?';
                sendProgressToGame(
                  `🎵 Music ${musicNum}/5 downloaded`,
                  downloadedCount,
                  totalFiles
                );
              }
            }
          } catch (err) {
            console.warn(`⚠️ Failed to download ${assetUrl}:`, err.message);
            // Continue with other files even if one fails
          }
        }
        
        // Installation complete
        console.log(`🎉 INSTALLATION COMPLETE: ${downloadedCount}/${totalFiles} files`);
        
        if (downloadedCount >= 15) { // At least 15 files (including music)
          sendProgressToGame(
            '✅ Game + Music installed! Ready for home screen.',
            downloadedCount,
            totalFiles
          );
          
          // Trigger game music to start
          notifyGameMusicReady();
        }
        
        return self.skipWaiting();
        
      } catch (error) {
        console.error('❌ Installation failed:', error);
        sendProgressToGame('⚠️ Installation incomplete - refresh to retry', 0, totalFiles);
        throw error;
      }
    })()
  );
});

// ===== ACTIVATE: Clean old caches =====
self.addEventListener('activate', event => {
  console.log('🔄 [SW] Activating with forced music cache...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete ALL old caches
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== FETCH: Serve cached files =====
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle music files with cache-first strategy
  if (url.includes('.mp3')) {
    event.respondWith(
      (async () => {
        // Try cache first (music should be there after installation)
        const cached = await caches.match(event.request);
        if (cached) {
          console.log(`🎵 Playing from cache: ${url.split('/').pop()}`);
          return cached;
        }
        
        // If not in cache, try network
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            // Cache for next time
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          // No network, no cache
          return new Response('', { 
            status: 404,
            headers: { 'Content-Type': 'audio/mpeg' }
          });
        }
      })()
    );
    return;
  }
  
  // For other files: cache-first
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Cache new files (except large ones)
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Game asset offline');
          });
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
        progressPercent: Math.round((current / total) * 100)
      });
    });
  });
}

function notifyGameMusicReady() {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'MUSIC_READY',
        message: '🎵 All music tracks downloaded and ready!'
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
