const CACHE = 'ausmass-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/image.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE) ? caches.delete(k) : Promise.resolve())))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // HTML navigations: network-first to avoid white screens after deploys
  const acceptsHTML = req.headers.get('accept')?.includes('text/html');
  if (acceptsHTML) {
    e.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (url.origin === location.origin) {
    // static assets: cache-first
    e.respondWith(caches.match(req).then((res) => res || fetch(req)));
  } else {
    // external/API: network-first with cache fallback
    e.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});


