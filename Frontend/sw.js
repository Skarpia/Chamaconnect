// Service Worker for ChamaConnect Performance Optimization
const CACHE_NAME = 'chamaconnect-v1';
const STATIC_CACHE = 'chamaconnect-static-v1';
const API_CACHE = 'chamaconnect-api-v1';
const IMAGE_CACHE = 'chamaconnect-images-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  static: {
    cacheName: STATIC_CACHE,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100,
  },
  api: {
    cacheName: API_CACHE,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50,
  },
  images: {
    cacheName: IMAGE_CACHE,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 200,
  },
};

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/fonts/inter-var.woff2',
  '/images/hero-bg.webp',
  '/_next/static/css/',
  '/_next/static/chunks/',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('SW: Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Handle different request types
  if (url.origin === self.location.origin) {
    // Handle static assets
    if (isStaticAsset(request.url)) {
      event.respondWith(cacheFirst(request, CACHE_STRATEGIES.static));
    }
    // Handle API requests
    else if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirst(request, CACHE_STRATEGIES.api));
    }
    // Handle HTML pages
    else if (request.headers.get('accept').includes('text/html')) {
      event.respondWith(staleWhileRevalidate(request, CACHE_STRATEGIES.static));
    }
  }
  // Handle external images
  else if (isImageRequest(request.url)) {
    event.respondWith(cacheFirst(request, CACHE_STRATEGIES.images));
  }
});

// Cache strategies implementation
async function cacheFirst(request, strategy) {
  try {
    const cache = await caches.open(strategy.cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('SW: Serving from cache:', request.url);
      return cached;
    }
    
    console.log('SW: Fetching from network:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.error('SW: CacheFirst strategy failed:', error);
    throw error;
  }
}

async function networkFirst(request, strategy) {
  try {
    console.log('SW: Trying network first:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(strategy.cacheName);
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('SW: Network failed, trying cache:', request.url);
    const cache = await caches.open(strategy.cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request, strategy) {
  const cache = await caches.open(strategy.cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    return response;
  });
  
  if (cached) {
    console.log('SW: Serving stale while revalidating:', request.url);
    return cached;
  }
  
  console.log('SW: No cache, waiting for network:', request.url);
  return fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  return url.includes('/_next/static/') ||
         url.includes('/fonts/') ||
         url.includes('/images/') ||
         url.endsWith('.css') ||
         url.endsWith('.js') ||
         url.endsWith('.woff2') ||
         url.endsWith('.webp');
}

function isImageRequest(url) {
  return url.includes('.jpg') ||
         url.includes('.jpeg') ||
         url.includes('.png') ||
         url.includes('.webp') ||
         url.includes('.avif');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('SW: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Get all pending requests from IndexedDB
    const pendingRequests = await getPendingRequests();
    
    for (const request of pendingRequests) {
      try {
        await fetch(request.url, request.options);
        await removePendingRequest(request.id);
        console.log('SW: Background sync completed for:', request.url);
      } catch (error) {
        console.error('SW: Background sync failed for:', request.url, error);
      }
    }
  } catch (error) {
    console.error('SW: Background sync error:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('SW: Push notification received:', data);
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey,
      },
      actions: [
        {
          action: 'explore',
          title: 'View Details',
        },
        {
          action: 'close',
          title: 'Close',
        },
      ],
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// IndexedDB helpers for offline queue
async function getPendingRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('chamaconnect-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');
      const getRequest = store.getAll();
      
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id' });
      }
    };
  });
}

async function removePendingRequest(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('chamaconnect-offline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve(deleteRequest.result);
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

async function getCacheStats() {
  const stats = {};
  
  for (const [name, strategy] of Object.entries(CACHE_STRATEGIES)) {
    const cache = await caches.open(strategy.cacheName);
    const keys = await cache.keys();
    stats[name] = {
      entries: keys.length,
      cacheName: strategy.cacheName,
    };
  }
  
  return stats;
}

console.log('SW: Service worker script loaded');
