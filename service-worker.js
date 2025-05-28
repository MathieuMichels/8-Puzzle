console.log('🚀 Service Worker: Script loaded');

const CACHE_NAME = '8puzzle-cache-v6';
const APP_VERSION = '1.5.0';

const CRITICAL_RESOURCES = [
  './',
  'index.html',
  'assets/css/style.css',
  'assets/js/script.js',
  'manifest.json',
  'logo.svg',
  'icons/icon-192x192.svg',
  'icons/icon-512x512.svg'
];

const SECONDARY_RESOURCES = [
  'assets/move_data/index.json',
  'assets/move_data/moves_0.json',
  'assets/move_data/moves_1.json',
  'assets/move_data/moves_2.json',
  'assets/move_data/moves_3.json',
  'assets/move_data/moves_4.json',
  'assets/move_data/moves_5.json',
  'assets/move_data/moves_6.json',
  'assets/move_data/moves_7.json',
  'assets/move_data/moves_8.json',
  'assets/move_data/moves_9.json',
  'assets/move_data/moves_10.json',
  'assets/move_data/moves_11.json',
  'assets/move_data/moves_12.json',
  'assets/move_data/moves_13.json',
  'assets/move_data/moves_14.json',
  'assets/move_data/moves_15.json',
  'assets/move_data/moves_16.json',
  'assets/move_data/moves_17.json',
  'assets/move_data/moves_18.json',
  'assets/move_data/moves_19.json',
  'assets/move_data/moves_20.json',
  'assets/move_data/moves_21.json',
  'assets/move_data/moves_22.json',
  'assets/move_data/moves_23.json',
  'assets/move_data/moves_24.json',
  'assets/move_data/moves_25.json',
  'assets/move_data/moves_26.json',
  'assets/move_data/moves_27.json',
  'assets/move_data/moves_28.json',
  'assets/move_data/moves_29.json',
  'assets/move_data/moves_30.json',
  'assets/move_data/moves_31.json'
];

const EXTERNAL_RESOURCES = [
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
  console.log('📦 Service Worker: Installation started');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('📂 Cache opened:', CACHE_NAME);
        
        console.log('🔄 Caching critical resources...');
        const criticalResults = await Promise.allSettled(
          CRITICAL_RESOURCES.map(async url => {
            try {
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status} for ${url}`);
              }
              await cache.put(url, response);
              console.log('✅ Cached:', url);
            } catch (error) {
              console.warn('⚠️ Cache failure (critical):', url, error.message);
              throw error;
            }
          })
        );
        
        const failedCritical = criticalResults.filter(result => result.status === 'rejected');
        if (failedCritical.length > 0) {
          console.error('❌ Failed to cache critical resources');
          throw new Error('Critical resources failed to cache');
        }
        
        console.log('🔄 Caching secondary resources...');
        Promise.allSettled(
          SECONDARY_RESOURCES.map(async url => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                console.log('✅ Cached (secondary):', url);
              }
            } catch (error) {
              console.warn('⚠️ Cache failure (secondary):', url, error.message);
            }
          })
        );
        
        console.log('🔄 Caching external resources...');
        Promise.allSettled(
          EXTERNAL_RESOURCES.map(async url => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                console.log('✅ Cached (external):', url);
              }
            } catch (error) {
              console.warn('⚠️ Cache failure (external):', url, error.message);
            }
          })
        );
        
        console.log('🎉 Installation completed successfully');
        
        self.skipWaiting();
        
      } catch (error) {
        console.error('❌ Installation error:', error);
        throw error;
      }
    })()
  );
});

self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: Activation started');
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(cacheName => cacheName.startsWith('8puzzle-cache-') && cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        await Promise.all(deletePromises);
        
        await self.clients.claim();
        
        console.log('✅ Service Worker activated and ready');
        
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: APP_VERSION,
            cacheName: CACHE_NAME
          });
        });
        
      } catch (error) {
        console.error('❌ Activation error:', error);
      }
    })()
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (event.request.method !== 'GET') {
    return;
  }
  
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        if (url.origin === location.origin || EXTERNAL_RESOURCES.includes(event.request.url)) {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            console.log('📦 Served from cache:', event.request.url);
            return cachedResponse;
          }
        }
        
        console.log('🌐 Network fetch attempt:', event.request.url);
        const networkResponse = await fetch(event.request);
        
        if (networkResponse.ok && url.origin === location.origin) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
          console.log('💾 Cached after fetch:', event.request.url);
        }
        
        return networkResponse;
        
      } catch (error) {
        console.warn('⚠️ Fetch error for:', event.request.url, error.message);
        
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log('🔄 Fallback cache for:', event.request.url);
          return cachedResponse;
        }
        
        if (event.request.mode === 'navigate') {
          const indexCache = await caches.match('./index.html');
          if (indexCache) {
            console.log('🏠 Fallback to index.html');
            return indexCache;
          }
        }
        
        return new Response(
          `<!DOCTYPE html>
          <html>
          <head>
            <title>8-Puzzle - Offline</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .offline { color: #666; }
              .retry { margin-top: 20px; }
              button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; }
            </style>
          </head>
          <body>
            <div class="offline">
              <h1>🧩 8-Puzzle</h1>
              <h2>Offline Mode</h2>
              <p>This page is not available offline.</p>
              <div class="retry">
                <button onclick="location.reload()">Retry</button>
                <button onclick="location.href='./'">Back to Game</button>
              </div>
            </div>
          </body>
          </html>`,
          {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'no-cache'
            }
          }
        );
      }
    })()
  );
});

self.addEventListener('message', event => {
  console.log('📨 Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Forced skip to new version');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: APP_VERSION,
      cacheName: CACHE_NAME
    });
  }
});

self.addEventListener('error', event => {
  console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ Promise rejected in Service Worker:', event.reason);
});

console.log('🎯 Service Worker configured - Version:', APP_VERSION);
