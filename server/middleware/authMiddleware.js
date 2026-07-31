const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  // Получаем токен из заголовка Authorization (формат: "Bearer <token>")
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Отсутствует токен авторизации' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Проверяем токен с использованием секретного ключа
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_default_key');
    // Добавляем данные пользователя (id, role и т.д.) в объект запроса
    req.user = decoded;
    
    // Проверка блокировки в БД
    const User = require('../models/User');
    const dbUser = await User.findById(decoded.id);
    if (!dbUser) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }
    if (dbUser.isBlocked) {
      return res.status(403).json({ message: 'Аккаунт заблокирован', isBlocked: true });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Неверный или просроченный токен' });
  }
};

module.exports = authMiddleware;
