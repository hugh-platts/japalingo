const CACHE_NAME = 'japalingo-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './words.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

function networkFirst(event) {
    return fetch(event.request).then(response => {
        if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
    }).catch(() => caches.match(event.request));
}

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // Network-first for HTML and JSON so updates always show when online
    if (url.pathname.endsWith('.html') || url.pathname.endsWith('.json') || url.pathname === '/' || url.pathname.endsWith('/')) {
        event.respondWith(networkFirst(event));
        return;
    }
    // Cache-first for everything else (images, fonts, etc.)
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200 || response.type === 'opaque') return response;
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => caches.match('./index.html'));
        })
    );
});
