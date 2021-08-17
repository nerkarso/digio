const cacheName = 'cache-v1';
const precacheResources = [
  '/',
  '/404.html',
  '/css/main.min.css',
  '/js/main.min.js',
  '/img/icons/icon-48x48.png',
  '/img/stations/beatfm.jpg',
  '/img/stations/garuda.jpg',
  '/img/stations/nio.jpg',
  '/img/stations/radio10.jpg'
];

// Emits at the end of registration.
// A good place for caching static assets.
self.addEventListener('install', event => {
  console.log('Service worker installing...');

  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(precacheResources);
    })
  );

  // Activate a new service worker immediately.
  self.skipWaiting();
});

// The service worker takes control of the page.
// Often used to update caches.
self.addEventListener('activate', event => {
  console.log('Service worker activating...');

  // Delete outdated caches.
  const cacheWhitelist = [cacheName];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Act as a proxy between your web app and the network.
// Fetch listener to intercept requests from our domain.
self.addEventListener('fetch', event => {
  // console.log("⚡ [Fetching]", event.request.url);

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(response => {
        if (response.status === 404) {
          return caches.match('404.html');
        }

        return caches.open(cacheName).then(cache => {
          cache.put(event.request.url, response.clone());
          return response;
        });
      });
    })
  );
});
