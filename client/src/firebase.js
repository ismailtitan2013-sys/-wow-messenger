import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyC2XVrLZDLLYGyKWM5PtLDpehz_RbCg-Lk",
  authDomain: "wow-30c41.firebaseapp.com",
  projectId: "wow-30c41",
  storageBucket: "wow-30c41.firebasestorage.app",
  messagingSenderId: "719890517947",
  appId: "1:719890517947:web:e9c569e3d9616eb7347e9e",
  measurementId: "G-ZB2GK0CS4"
};

const app = initializeApp(firebaseConfig);

// Firebase Cloud Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (err) {
  console.log('Firebase Messaging не поддерживается в этом браузере');
}

// Получить FCM токен для push-уведомлений
export const requestFCMToken = async () => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Уведомления отклонены');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: 'BAtDKzVGNSBvFeW-0cYE7VW-GNwQGi6QJJFxmvrrVo5Y8D_JCZ9qwrKMKGE_MO9trR_l4key6Vhxno7OXNnPnvc'
    });
    
    return token;
  } catch (err) {
    console.error('Ошибка получения FCM токена:', err);
    return null;
  }
};

// Обработчик входящих уведомлений, когда приложение на переднем плане
export const onForegroundMessage = (callback) => {
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export { messaging };
export default app;
