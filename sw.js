// ══════════════════════════════════════════════════════
//  Service Worker — Directorio de Manuales Solbayres
//  Cambiá CACHE_VERSION cada vez que subas cambios grandes
// ══════════════════════════════════════════════════════
const CACHE_VERSION = 'slb-manuales-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Instalación: guarda la "cáscara" de la app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      // Si falta algún archivo, no frena la instalación
      .then(cache => Promise.allSettled(APP_SHELL.map(f => cache.add(f))))
      .then(() => self.skipWaiting())
  );
});

// Activación: borra cachés de versiones viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejamos GET del propio sitio.
  // Apps Script, Drive, YouTube y Google Fonts van siempre directo a internet.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Páginas: primero internet (para ver siempre la última versión), si no hay conexión usa la copia guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Íconos y archivos estáticos: primero la copia guardada, si no existe va a internet
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_VERSION).then(c => c.put(req, copy));
      return res;
    }))
  );
});
