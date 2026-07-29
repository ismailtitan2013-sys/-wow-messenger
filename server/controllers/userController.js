const User = require('../models/User');
const logger = require('../utils/logger');

// Поиск пользователей по имени для начала нового чата
const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          username: { $regex: req.query.search, $options: 'i' }
        }
      : {};

    // Ищем пользователей, кроме самого себя
    const users = await User.find(keyword).find({ _id: { $ne: req.user.id } }).select('-password');
    
    // Применяем настройки приватности
    const usersWithPrivacy = users.map(u => {
      const uObj = u.toJSON();
      if (uObj.settings && uObj.settings.showOnlineStatus === false) {
        uObj.status = 'offline';
      }
      return uObj;
    });
    
    res.status(200).json(usersWithPrivacy);
  } catch (error) {
    logger.error('Ошибка при поиске пользователей:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, bio, avatarUrl, settings } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    
    if (settings) {
      user.settings = { ...user.settings, ...settings };
    }

    await user.save();
    logger.info(`User profile updated: ${user.username}`);
    res.status(200).json(user);
  } catch (error) {
    logger.error('Ошибка обновления профиля:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

module.exports = {
  searchUsers,
  updateProfile
};
