const CACHE = 'ausmass-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/image.png'
];

self.addEventListener('install', (e: any) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => (self as any).skipWaiting())
  );
});

self.addEventListener('activate', (e: any) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE) ? caches.delete(k) : Promise.resolve()))).then(() => (self as any).clients.claim())
  );
});

self.addEventListener('fetch', (e: any) => {
  const req = e.request;
  // Network falling back to cache for API calls; cache-first for assets
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // static files: cache first
    e.respondWith(
      caches.match(req).then(res => res || fetch(req))
    );
  } else {
    // external/API: network first
    e.respondWith(
      fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match(req))
    );
  }
});


