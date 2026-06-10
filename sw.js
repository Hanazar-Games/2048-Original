var CACHE_NAME = 'hanazar-2048-v1';
var urlsToCache = [
  './',
  './index.html',
  './style/main.css',
  './favicon.ico',
  './js/bind_polyfill.js',
  './js/classlist_polyfill.js',
  './js/animframe_polyfill.js',
  './js/keyboard_input_manager.js',
  './js/html_actuator.js',
  './js/grid.js',
  './js/tile.js',
  './js/local_storage_manager.js',
  './js/audio_manager.js',
  './js/achievements.js',
  './js/stats_manager.js',
  './js/ai_player.js',
  './js/game_manager.js',
  './js/application.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (name) {
          return name !== CACHE_NAME;
        }).map(function (name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }
      return fetch(event.request).then(function (networkResponse) {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
