const CACHE_NAME = 'darts-app-v3';

// Bestanden die we offline willen bewaren
const URLS_TO_CACHE = [
    './',
    './index.html',
    './trainer.html',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Geef het bestand uit de cache, of haal het anders van het internet
            return response || fetch(event.request);
        })
    );
});
