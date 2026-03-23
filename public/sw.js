const CACHE_NAME = 'sak-supervision-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
];

// ── Firebase Cloud Messaging (background push) ──
// Import Firebase messaging SW compat for push handling
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
  if (event.request.method !== 'GET') return;

  // Network-first for API/Firebase calls
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});
