/*
  Service Worker — Teodoro Páez Radio Online
  ---------------------------------------------------------------
  IMPORTANTE: sube el número de CACHE_VERSION cada vez que subas
  cambios nuevos (por ejemplo v2, v3...). Esto obliga a los
  navegadores de tus oyentes a descargar la versión nueva en vez
  de quedarse con una copia vieja guardada en caché.
  ---------------------------------------------------------------
*/
const CACHE_VERSION = 'v4';
const CACHE_NAME = `teodoro-paez-${CACHE_VERSION}`;

// Archivos "estáticos" que se pueden guardar en caché sin problema
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png',
  './icons/favicon.ico',
  './media/poster.jpg',
  './media/intro.mp4',
  './media/ad-01.png',
  './media/ad-02.png',
  './media/ad-03.png',
  './media/ad-04.png',
  './media/ad-05.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Activa el nuevo SW de inmediato, sin esperar a que se cierren las pestañas viejas
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Toma control de todas las pestañas abiertas de inmediato
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Nunca cachear el stream de audio en vivo ni el video (pesado, y el
  // navegador ya lo gestiona con su propio caché de medios)
  if (req.destination === 'audio' || req.destination === 'video' || url.pathname.includes('listen.php')) {
    return;
  }

  // HTML / navegación: red primero, con respaldo en caché si no hay internet.
  // Así, cuando subes cambios nuevos, el visitante los ve de inmediato.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  // Resto de archivos estáticos (íconos, manifest, fuentes): caché primero,
  // y se actualiza en segundo plano para la próxima vez.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
