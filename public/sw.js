// Service Worker for MD Stúdio Play (https://mdstudioplay.ai.studio)
const CACHE_NAME = 'mdstudioplay-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through network requests, ignoring chrome-extension or external analytics
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
});
