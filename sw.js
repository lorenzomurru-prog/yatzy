// Cache per giocare offline. Cambia VERSION quando aggiorni i file.
const VERSION = 'cd-v12';
const FILES = ['./', 'index.html', 'style.css', 'game.js', 'icon.svg', 'manifest.webmanifest',
  'img/gonario/idle.webp', 'img/gonario/blink.webp', 'img/gonario/talk.webp', 'img/gonario/happy.webp',
  'img/gonario/wow.webp', 'img/gonario/smirk.webp', 'img/gonario/sad.webp', 'img/gonario/think.webp', 'img/gonario/ballo.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Prima la rete (così vedi subito le modifiche), la cache solo se sei offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
