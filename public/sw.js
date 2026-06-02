self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));

// 푸시 알림 수신 (나중에 확장)
self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || '벌점 알림', {
      body: data.body || '새로운 벌점이 등록되었습니다.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'demerit-notification',
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/student'));
});
