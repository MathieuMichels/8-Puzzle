// Service Worker for 8-Puzzle PWA
console.log('🚀 Service Worker: Script chargé');

const CACHE_NAME = '8puzzle-cache-v6';
const APP_VERSION = '1.4.0';

// Ressources critiques (nécessaires pour le fonctionnement hors ligne)
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

// Ressources secondaires (données de jeu - peuvent être chargées à la demande)
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

// Ressources externes
const EXTERNAL_RESOURCES = [
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Installation démarrée');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('📂 Cache ouvert:', CACHE_NAME);
        
        // Mettre en cache les ressources critiques d'abord
        console.log('🔄 Mise en cache des ressources critiques...');
        const criticalResults = await Promise.allSettled(
          CRITICAL_RESOURCES.map(async url => {
            try {
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status} for ${url}`);
              }
              await cache.put(url, response);
              console.log('✅ Mis en cache:', url);
            } catch (error) {
              console.warn('⚠️ Échec de mise en cache (critique):', url, error.message);
              throw error; // Bloquer l'installation si ressource critique échoue
            }
          })
        );
        
        // Vérifier que toutes les ressources critiques sont en cache
        const failedCritical = criticalResults.filter(result => result.status === 'rejected');
        if (failedCritical.length > 0) {
          console.error('❌ Échec de mise en cache des ressources critiques');
          throw new Error('Critical resources failed to cache');
        }
        
        // Mettre en cache les ressources secondaires (non bloquant)
        console.log('🔄 Mise en cache des ressources secondaires...');
        Promise.allSettled(
          SECONDARY_RESOURCES.map(async url => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                console.log('✅ Mis en cache (secondaire):', url);
              }
            } catch (error) {
              console.warn('⚠️ Échec de mise en cache (secondaire):', url, error.message);
            }
          })
        );
        
        // Mettre en cache les ressources externes (non bloquant)
        console.log('🔄 Mise en cache des ressources externes...');
        Promise.allSettled(
          EXTERNAL_RESOURCES.map(async url => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                console.log('✅ Mis en cache (externe):', url);
              }
            } catch (error) {
              console.warn('⚠️ Échec de mise en cache (externe):', url, error.message);
            }
          })
        );
        
        console.log('🎉 Installation terminée avec succès');
        
        // Forcer l'activation immédiate
        self.skipWaiting();
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'installation:', error);
        throw error;
      }
    })()
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: Activation démarrée');
  
  event.waitUntil(
    (async () => {
      try {
        // Nettoyer les anciens caches
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(cacheName => cacheName.startsWith('8puzzle-cache-') && cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('🗑️ Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        await Promise.all(deletePromises);
        
        // Prendre le contrôle de tous les clients
        await self.clients.claim();
        
        console.log('✅ Service Worker activé et prêt');
        
        // Notifier tous les clients de la mise à jour
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: APP_VERSION,
            cacheName: CACHE_NAME
          });
        });
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'activation:', error);
      }
    })()
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignorer les requêtes Chrome DevTools
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Stratégie: Cache First pour les ressources de l'app
        if (url.origin === location.origin || EXTERNAL_RESOURCES.includes(event.request.url)) {
          // Chercher d'abord dans le cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            console.log('📦 Servi depuis le cache:', event.request.url);
            return cachedResponse;
          }
        }
        
        // Si pas en cache ou ressource externe, essayer le réseau
        console.log('🌐 Tentative de récupération réseau:', event.request.url);
        const networkResponse = await fetch(event.request);
        
        // Mettre en cache les réponses réussies pour les ressources de l'app
        if (networkResponse.ok && url.origin === location.origin) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
          console.log('💾 Mise en cache après récupération:', event.request.url);
        }
        
        return networkResponse;
        
      } catch (error) {
        console.warn('⚠️ Erreur de récupération pour:', event.request.url, error.message);
        
        // Fallback: essayer de servir depuis le cache même pour les ressources non-origin
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log('🔄 Fallback cache pour:', event.request.url);
          return cachedResponse;
        }
        
        // Si c'est une navigation et qu'on n'a rien, servir la page d'accueil
        if (event.request.mode === 'navigate') {
          const indexCache = await caches.match('./index.html');
          if (indexCache) {
            console.log('🏠 Fallback vers index.html');
            return indexCache;
          }
        }
        
        // Dernière tentative: page d'erreur offline simple
        return new Response(
          `<!DOCTYPE html>
          <html>
          <head>
            <title>8-Puzzle - Hors ligne</title>
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
              <h2>Mode hors ligne</h2>
              <p>Cette page n'est pas disponible hors ligne.</p>
              <div class="retry">
                <button onclick="location.reload()">Réessayer</button>
                <button onclick="location.href='./'">Retour au jeu</button>
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

// Écouter les messages des clients
self.addEventListener('message', event => {
  console.log('📨 Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Passage forcé à la nouvelle version');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: APP_VERSION,
      cacheName: CACHE_NAME
    });
  }
});

// Gestion des erreurs globales
self.addEventListener('error', event => {
  console.error('❌ Erreur Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ Promise rejetée dans Service Worker:', event.reason);
});

console.log('🎯 Service Worker configuré - Version:', APP_VERSION);
