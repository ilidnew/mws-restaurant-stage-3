import idb from './idb'

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('restaurant-static-v1').then(function(cache) {
      return cache.addAll([
        '/',
        'dist/js/all.js',
        'dist/img/1.jpg',
        'dist/img/2.jpg',
        'dist/img/3.jpg',
        'dist/img/4.jpg',
        'dist/img/5.jpg',
        'dist/img/6.jpg',
        'dist/img/7.jpg',
        'dist/img/8.jpg',
        'dist/img/9.jpg',
        'dist/img/10.jpg',
        'dist/css/responsive.min.css',
        'dist/css/styles.min.css',
        'data/restaurants.json'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request);
    })
  );
});
