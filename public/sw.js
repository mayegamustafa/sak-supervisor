const CACHE_NAME = 'sak-supervision-v7';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/schools',
  '/visits',
  '/issues',
  '/profile',
  '/admin',
  '/admin/settings',
  '/chat',
  '/notices',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Offline fallback page HTML — shown when no cache and no network
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SAK Supervision – Offline</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;color:#1e293b;text-align:center;padding:2rem}
.card{background:#fff;border-radius:1rem;padding:2.5rem;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:360px}
h1{font-size:1.5rem;margin-bottom:.75rem;color:#1d4ed8}p{color:#64748b;line-height:1.6;margin-bottom:1.5rem}
button{background:#1d4ed8;color:#fff;border:none;border-radius:.5rem;padding:.75rem 1.5rem;font-size:1rem;cursor:pointer}
button:active{background:#1e40af}</style></head>
<body><div class="card"><h1>You&rsquo;re Offline</h1><p>Check your internet connection. Any data you viewed before will still be available.</p><button onclick="location.reload()">Try Again</button></div></body></html>`;

// ── Firebase Cloud Messaging (background push) ──
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

// Firebase config is injected from env at build time via the main app,
// but the SW needs its own copy — we read from search params or hardcode.
// The messaging SDK only needs projectId, apiKey, appId, messagingSenderId.
if (typeof firebase !== 'undefined' && firebase.messaging) {
  try {
    firebase.initializeApp({
      apiKey: 'AIzaSyB3OrhyKKcl1lgg40Pgil6NuvT9B-vme_M',
      projectId: 'sir-apollo-kaggwa-supervision',
      messagingSenderId: '377893065842',
      appId: '1:377893065842:web:5d4a973dd02ff19e5b5eeb',
    });
    const messaging = firebase.messaging();

    // Handle background push notifications
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || 'SAK Supervision';
      const body = payload.notification?.body || 'You have a new notification';
      const icon = '/icons/icon-192x192.png';
      self.registration.showNotification(title, { body, icon, badge: icon });
    });
  } catch (e) {
    // Firebase messaging not configured yet — that's fine, skip
  }
}

// ── Push event fallback (works even without Firebase SDK) ──
self.addEventListener('push', (event) => {
  if (event.data) {
    let data;
    try {
      data = event.data.json();
    } catch {
      data = { notification: { title: 'SAK Supervision', body: event.data.text() } };
    }
    const title = data.notification?.title || 'SAK Supervision';
    const body = data.notification?.body || '';
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
      })
    );
  }
});

// ── Notification click handler ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/dashboard');
    })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip caching for Firebase/Google API calls — Firestore SDK handles its own IndexedDB cache
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // For navigation requests (HTML pages): network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html' },
            });
          })
        )
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;
        // Don't cache opaque responses from CDNs we can't inspect
        if (response.type === 'opaque') return response;
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      }).catch(() => {
        // Return a transparent 1x1 gif for failed image requests
        if (request.destination === 'image') {
          return new Response(
            Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0)),
            { headers: { 'Content-Type': 'image/gif' } }
          );
        }
        return new Response('', { status: 408 });
      });
    })
  );
});
