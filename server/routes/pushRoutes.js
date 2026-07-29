const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Инициализация Firebase Admin SDK
// В продакшене: задайте GOOGLE_APPLICATION_CREDENTIALS в .env 
// или передайте serviceAccount напрямую
if (!admin.apps.length) {
  try {
    // Попытка инициализации через переменные окружения или дефолтные credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Для разработки — минимальная инициализация (без отправки push)
      admin.initializeApp({
        projectId: 'wow-30c41'
      });
      console.log('⚠️  Firebase Admin запущен без credentials — Push-уведомления не будут отправляться.');
      console.log('   Для работы push задайте FIREBASE_SERVICE_ACCOUNT в .env');
    }
  } catch (err) {
    console.error('Ошибка инициализации Firebase Admin:', err);
  }
}

router.use(authMiddleware);

// Сохранение FCM-токена устройства
router.post('/subscribe', async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM токен обязателен' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Инициализируем массив если его нет
    if (!user.fcmTokens) user.fcmTokens = [];
    
    // Проверка, есть ли уже такой токен
    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }
    
    res.status(201).json({ message: 'FCM токен сохранен' });
  } catch (err) {
    console.error('Ошибка сохранения FCM токена:', err);
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

// Функция отправки Push через Firebase Cloud Messaging
const sendPushNotification = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

    // Проверяем что Firebase Admin полностью инициализирован
    if (!admin.apps.length) return;

    const message = {
      notification: {
        title: payload.title || 'WoW Messenger',
        body: payload.body || 'Новое сообщение'
      },
      data: {
        chatId: payload.chatId || '',
        icon: payload.icon || '/favicon.svg'
      }
    };

    // Отправляем каждому токену (устройству) пользователя
    const sendPromises = user.fcmTokens.map(async (token) => {
      try {
        await admin.messaging().send({
          ...message,
          token
        });
      } catch (err) {
        // Если токен невалиден — удаляем его
        if (err.code === 'messaging/invalid-registration-token' || 
            err.code === 'messaging/registration-token-not-registered') {
          console.log('Удаление невалидного FCM токена');
          user.fcmTokens = user.fcmTokens.filter(t => t !== token);
          await user.save();
        } else {
          console.error('Ошибка отправки FCM:', err.code || err.message);
        }
      }
    });
    
    await Promise.all(sendPromises);
  } catch (err) {
    console.error('Ошибка в функции отправки push:', err);
  }
};

module.exports = { router, sendPushNotification };
