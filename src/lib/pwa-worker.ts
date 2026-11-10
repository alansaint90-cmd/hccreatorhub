// Cache only the public connection notice. Never cache sessions, pages, actions or creator materials.
export const serviceWorker = `
const CACHE = 'hc-agency-offline-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add('/offline')).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('hc-agency-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(CACHE);
    return await cache.match('/offline') || new Response('Sem conexão. Reconecte-se para abrir a HC Agency.', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
  }));
});
`;
