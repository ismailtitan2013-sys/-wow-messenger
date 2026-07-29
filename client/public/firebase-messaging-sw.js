// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC2XVrLZDLLYGyKWM5PtLDpehz_RbCg-Lk",
  authDomain: "wow-30c41.firebaseapp.com",
  projectId: "wow-30c41",
  storageBucket: "wow-30c41.firebasestorage.app",
  messagingSenderId: "719890517947",
  appId: "1:719890517947:web:e9c569e3d9616eb7347e9e",
  measurementId: "G-ZB2GK0CS4"
});

const messaging = firebase.messaging();

// Обработка фоновых push-уведомлений
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'WoW Messenger';
  const notificationOptions = {
    body: payload.notification?.body || 'Новое сообщение',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data,
    vibrate: [200, 100, 200],
    tag: 'wow-message'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const chatId = event.notification.data?.chatId;
  const urlToOpen = chatId ? `/?chat=${chatId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Если приложение уже открыто, переключиться на него
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      // Иначе открыть новое окно
      return clients.openWindow(urlToOpen);
    })
  );
});
