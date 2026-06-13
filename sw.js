// SquadStats Service Worker
// Bump this version string every time you deploy a new version
const VERSION = 'squadstats-v2';
const CACHE = VERSION;

// Files to cache for offline / fast load
const PRECACHE = [
  '/',
  '/index.html',
];

// Install: cache core files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => {
      // Don't wait for old SW to stop — take over immediately
      return self.skipWaiting();
    })
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML (so updates are picked up), cache-first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always fetch Firebase and CDN requests from network
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('cdnjs') ||
    url.hostname.includes('fonts')
  ) {
    return; // Let browser handle normally
  }

  // Network-first for navigation (HTML pages)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Cache fresh copy
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// Listen for skip-waiting message from the app
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
