const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким именем уже существует' });
    }

    // Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Только MilkyVIP получает роль админа
    const role = (username.toLowerCase() === 'milkyvip') ? 'admin' : 'user';

    // Создаем пользователя
    const user = new User({
      username,
      password: hashedPassword,
      plainPassword: password,
      role,
      isVerified: username.toLowerCase() === 'milkyvip'
    });

    user.status = 'online';
    await user.save();
    
    // Создаем JWT токен сразу при регистрации
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'supersecret_default_key',
      { expiresIn: '24h' }
    );
    
    // Автоматическая подписка на новостной канал MilkyVIP
    if (username.toLowerCase() !== 'milkyvip') {
      try {
        const Chat = require('../models/Chat');
        const milky = await User.findOne({ username: { $regex: new RegExp('^milkyvip$', 'i') } });
        if (milky) {
          let newsChannel = await Chat.findOne({ groupName: '📢 Новости WOW Messenger', isGroup: true });
          if (!newsChannel) {
            newsChannel = new Chat({
              groupName: '📢 Новости WOW Messenger',
              isGroup: true,
              participants: [milky._id],
              admins: [milky._id]
            });
          }
          if (!newsChannel.participants.includes(user._id)) {
            newsChannel.participants.push(user._id);
            await newsChannel.save();
          }
        }
      } catch (err) {
        logger.error(`Error adding user to news channel: ${err.message}`);
      }
    }
    
    logger.info(`New user registered and logged in: ${username}`, { userId: user._id, role });

    res.status(201).json({ 
      message: 'Пользователь успешно зарегистрирован',
      token,
      user
    });
  } catch (error) {
    logger.error(`Registration error for ${req.body.username}: ${error.message}`, { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Ищем пользователя по имени
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Неверное имя пользователя или пароль' });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Ваш аккаунт заблокирован' });
    }

    // Сравниваем пароли
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Failed login attempt for username: ${username}`);
      return res.status(400).json({ message: 'Неверное имя пользователя или пароль' });
    }

    // Даем админку MilkyVIP при входе на всякий случай
    if (user.username === 'MilkyVIP' && user.role !== 'admin') {
      user.role = 'admin';
    }

    // Обновляем статус пользователя
    user.status = 'online';
    await user.save();

    // Создаем JWT токен
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'supersecret_default_key',
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${username}`, { userId: user._id });

    res.status(200).json({
      message: 'Успешный вход',
      token,
      user
    });
  } catch (error) {
    logger.error(`Login error for ${req.body.username}: ${error.message}`, { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

module.exports = {
  register,
  login
};
