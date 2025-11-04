self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('tuninghub-cache').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/css/style.css',
        '/js/main.js',
        '/public/img/THub Logo mit Hintergrund.png'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});