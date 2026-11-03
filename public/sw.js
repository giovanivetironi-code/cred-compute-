// ComputeCred service worker: offline page + cached static assets. Never caches /api or auth.
const V = 'cc-v3', STATIC = ['/offline.html', '/style.css', '/fx.js', '/ui.js', '/images/icon-180.png', '/images/icon-512.png', '/favicon.ico'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/auth')) return;
  if (r.mode === 'navigate') return e.respondWith(fetch(r).catch(() => caches.match('/offline.html')));
  if (/\.(css|js|png|ico|jpg|webmanifest)$/.test(u.pathname)) e.respondWith(caches.match(r).then(hit => { const net = fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(cc => cc.put(r, c)); } return res; }).catch(() => hit); return hit || net; }));
});
