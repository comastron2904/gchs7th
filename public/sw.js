const CACHE_NAME = 'gchs-dorm-v2';
const STATIC_ASSETS = ['/', '/student', '/teacher'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── 푸시 알림 수신 ──────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: '벌점 알림', body: e.data.text() }; }

  const title = data.title || '기숙사 벌점 알림';
  const options = {
    body: data.body || '새로운 벌점이 등록되었습니다.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'demerit-notification',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || '/student', studentId: data.studentId },
    actions: [
      { action: 'view', title: '확인하기' },
      { action: 'close', title: '닫기' }
    ]
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;

  const targetUrl = (e.notification.data && e.notification.data.url) || '/student';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('/student') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
