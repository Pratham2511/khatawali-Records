const STATIC_CACHE = 'khatawali-static-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

const isStaticAssetRequest = (request, url) => {
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;

  if (request.mode === 'navigate') return true;
  if (url.pathname.startsWith('/assets/')) return true;

  return ['style', 'script', 'worker', 'font', 'image'].includes(request.destination);
};

const networkFirst = async (request) => {
  const cache = await caches.open(STATIC_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const fallback = await cache.match('/index.html');
      if (fallback) return fallback;
    }

    throw new Error('Network request failed and no cache available.');
  }
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => (key === STATIC_CACHE ? null : caches.delete(key)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!isStaticAssetRequest(event.request, url)) {
    return;
  }

  event.respondWith(networkFirst(event.request));
});
