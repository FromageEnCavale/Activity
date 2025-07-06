// service-worker.js
self.addEventListener('install', e => {
    // Passe directement à l'activation
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    // Prend le contrôle de tous les clients immédiatement
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
    // Toujours aller chercher la ressource sur le réseau
    e.respondWith(fetch(e.request));
});