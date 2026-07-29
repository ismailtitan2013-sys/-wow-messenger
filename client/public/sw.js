self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'WoW Messenger', body: 'Новое сообщение' };
  
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    data: data.chatId // Сохраняем chatId чтобы открыть нужный чат при клике
  };
  
  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  
  // При клике открываем вкладку с мессенджером или фокусируемся на ней
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Ищем уже открытую вкладку
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url.indexOf('/') !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      // Если не открыта - открываем новую
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
