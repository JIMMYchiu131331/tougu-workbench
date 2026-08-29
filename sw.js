/* Service Worker：网络优先 + 离线回退缓存（保证升级即时生效，断网时仍可打开） */
'use strict';

const CACHE = 'tougu-v8';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/util.js',
  './js/store.js',
  './js/quotes.js',
  './js/news.js',
  './js/render_image.js',
  './js/ai.js',
  './js/sync.js',
  './js/app.js',
  './js/views/home.js',
  './js/views/clients.js',
  './js/views/content.js',
  './js/views/tools.js',
  './js/views/settings.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }).catch(() =>
      caches.match(e.request, { ignoreSearch: true }).then(hit => hit || Response.error())
    )
  );
});
