var CACHE_NAME = 'hanazar-2048-v2-5-board-layer-lock';
var urlsToCache = [
  './',
  './index.html',
  './404.html',
  './style/main.css',
  './favicon.ico',
  './apple-touch-icon.png',
  './apple-touch-icon-precomposed.png',
  './manifest.json',
  './meta/apple-touch-icon.png',
  './meta/apple-touch-startup-image-640x1096.png',
  './meta/apple-touch-startup-image-640x920.png',
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
  './js/daily_challenge.js',
  './js/grid_sizer.js',
  './js/ai_player.js',
  './js/game_manager.js',
  './js/application.js'
];

self.addEventListener('install', function (event) {
  if (!/^https?:$/.test(self.location.protocol)) {
    self.skipWaiting();
    return;
  }

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
  var request = event.request;
  var requestUrl = new URL(request.url);

  if (!/^https?:$/.test(requestUrl.protocol)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (networkResponse) {
        if (networkResponse && networkResponse.status !== 404) {
          return networkResponse;
        }
        return caches.match('./index.html');
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (response) {
      if (response) {
        return response;
      }
      return fetch(request).then(function (networkResponse) {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(function () {
        return new Response('', {
          status: 504,
          statusText: 'Offline'
        });
      });
    })
  );
});
