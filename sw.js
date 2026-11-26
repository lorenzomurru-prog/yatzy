// Cache per giocare offline. Cambia VERSION quando aggiorni i file.
const VERSION = 'cd-v24';
const FILES = ['./', 'index.html', 'style.css', 'game.js', 'icon.svg', 'manifest.webmanifest',
  'img/gonario/idle.webp', 'img/gonario/blink.webp', 'img/gonario/talk.webp', 'img/gonario/happy.webp',
  'img/gonario/wow.webp', 'img/gonario/smirk.webp', 'img/gonario/sad.webp', 'img/gonario/think.webp', 'img/gonario/ballo.webp',
  'img/rivali/gavinedda.webp', 'img/rivali/casaro.webp', 'img/rivali/barista.webp', 'img/rivali/componidori.webp',
  'img/rivali/merdules.webp', 'img/rivali/mammuthones.webp',
  'img/giocatori/pastoreddu.webp', 'img/giocatori/tenore.webp', 'img/giocatori/launeddas.webp',
  'img/giocatori/boe.webp', 'img/giocatori/jana.webp', 'img/giocatori/piscadore.webp',
  'img/giocatori/sirbone.webp', 'img/giocatori/mufrone.webp', 'img/giocatori/cuaddeddu.webp',
  'audio/sottofondo.mp3', 'audio/notte.mp3', 'audio/vittoria.mp3'];

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
