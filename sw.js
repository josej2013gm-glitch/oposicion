// Service worker: permite instalar la web como app y abrirla sin conexión.
// Estrategia: red primero para los archivos de la propia web (así siempre ves la última versión)
// con copia en caché de respaldo; los scripts de Firebase y las fuentes se guardan al usarse.
// Las llamadas a Firestore, Storage, Google Auth y Gemini NO se cachean nunca.
const CACHE = 'oposicion-pl-v2';
const SHELL = ['./', 'index.html', 'styles.css', 'manifest.json', 'icons/icon-192.png', 'icons/icon.svg',
  'js/data.js', 'js/core.js', 'js/planner.js', 'js/temas.js', 'js/dashboard.js', 'js/stats.js', 'js/timer.js', 'js/tutor.js', 'js/sync.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const cdn = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')
    || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!same && !cdn) return;                 // APIs y autenticación: siempre directas a la red
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: same }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
