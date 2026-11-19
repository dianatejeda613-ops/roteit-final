const CACHE = 'rotateit-entrega final';
const ARCHIVOS = [
  './', 'index.html', 'manifest.json', 'css/styles.css', 'css/menu.css', 'img/logo.png',
  'js/db.js', 'js/partido.js', 'js/semana.js', 'js/clasificacion.js', 'js/noticias.js',
  'js/equipos.js', 'js/captura.js', 'js/pizarra.js', 'js/reportes.js', 'js/app.js'
];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS))));

self.addEventListener('activate', e =>
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));

self.addEventListener('fetch', e => {
  // Solo guardamos en caché los archivos del propio sitio; Supabase y el CDN van directo a la red
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return resp;
      });
    })
  );
});