const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { sendPushNotification } = require('../routes/pushRoutes');

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ status: 'online' });
    const totalMessages = await Message.countDocuments();
    const totalGroups = await Chat.countDocuments({ isGroup: true });

    res.status(200).json({
      totalUsers,
      onlineUsers,
      totalMessages,
      totalGroups
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

const broadcastMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Текст не может быть пустым' });
    }

    const users = await User.find({});
    
    // Send push notification to all users
    const pushPromises = users.map(user => 
      sendPushNotification(user._id.toString(), {
        title: 'Глобальное объявление',
        body: text,
        icon: '/favicon.svg',
        chatId: 'admin'
      })
    );
    
    await Promise.all(pushPromises);
    
    // Emit socket event for online users
    const io = req.app.get('io');
    if (io) {
      io.emit('global_announcement', text);
    }
    
    logger.info(`Admin broadcasted message: ${text}`);

    res.status(200).json({ message: 'Сообщение отправлено всем пользователям' });
  } catch (error) {
    logger.error('Error in broadcast message:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    
    const query = {};
    if (search) {
      query.username = { $regex: search, $options: 'i' };
    }
    
    // In our model we have "status" which is "online" or "offline" but the user wants "Blocked" vs "Active".
    // We didn't add "isBlocked" yet, so let's add it dynamically to query if provided
    if (status === 'blocked') {
      query.isBlocked = true;
    } else if (status === 'active') {
      query.isBlocked = { $ne: true };
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error fetching users:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Получить всех пользователей с паролями (только для админа)
const getAllUsersWithPasswords = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    
    const query = {};
    if (search) {
      query.username = { $regex: search, $options: 'i' };
    }
    if (status === 'blocked') {
      query.isBlocked = true;
    } else if (status === 'active') {
      query.isBlocked = { $ne: true };
    }

    // Используем select('+plainPassword') чтобы явно включить поле
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(); // lean() возвращает простой объект, минуя toJSON

    const total = await User.countDocuments(query);

    // Форматируем данные для клиента
    const formattedUsers = users.map(u => ({
      id: u._id.toString(),
      username: u.username,
      plainPassword: u.plainPassword || 'не сохранен',
      role: u.role,
      status: u.status,
      isBlocked: u.isBlocked,
      createdAt: u.createdAt,
      bio: u.bio,
      avatarUrl: u.avatarUrl
    }));

    res.status(200).json({
      users: formattedUsers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error fetching users with passwords:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Войти как любой пользователь (только для админа)
const loginAsUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Генерируем токен для этого пользователя
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'supersecret_default_key',
      { expiresIn: '24h' }
    );

    user.status = 'online';
    await user.save();

    logger.info(`Admin logged in as user: ${user.username}`);

    res.status(200).json({ token, user });
  } catch (error) {
    logger.error('Error in loginAsUser:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Нельзя заблокировать администратора' });
    }

    user.isBlocked = !user.isBlocked;
    // Если заблокировали, сбрасываем токен или ставим офлайн
    if (user.isBlocked) {
      user.status = 'offline';
    }
    await user.save();
    
    logger.info(`User block toggled: ${user.username}, new status: ${user.isBlocked}`);

    res.status(200).json({ message: user.isBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован', user });
  } catch (error) {
    logger.error('Error toggling block user:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

const toggleRole = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.username === 'MilkyVIP') {
      return res.status(403).json({ message: 'Нельзя изменить роль главного администратора' });
    }

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();
    
    logger.info(`User role toggled: ${user.username}, new role: ${user.role}`);

    res.status(200).json({ message: `Пользователь назначен ${user.role === 'admin' ? 'администратором' : 'пользователем'}`, user });
  } catch (error) {
    logger.error('Error toggling user role:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

const toggleVerifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    user.isVerified = !user.isVerified;
    await user.save();
    
    logger.info(`User verification toggled: ${user.username}, new status: ${user.isVerified}`);

    res.status(200).json({ message: user.isVerified ? 'Галочка выдана' : 'Галочка убрана', user });
  } catch (error) {
    logger.error('Error toggling user verification:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.role === 'admin' || user.username === 'MilkyVIP') {
      return res.status(403).json({ message: 'Нельзя удалить главного администратора' });
    }

    // 1. Удаляем личные чаты с этим пользователем
    await Chat.deleteMany({ isGroup: { $ne: true }, participants: { $in: [id] } });

    // 2. Удаляем пользователя из участников и админов всех групповых чатов
    await Chat.updateMany({ isGroup: true }, { $pull: { participants: id, admins: id } });

    // 3. Удаляем сообщения этого пользователя
    await Message.deleteMany({ senderId: id });

    // 4. Удаляем сам аккаунт
    await User.findByIdAndDelete(id);

    logger.info(`User and associated chats deleted: ${user.username}`);

    res.status(200).json({ message: 'Пользователь и его чаты успешно удалены' });
  } catch (error) {
    logger.error('Error deleting user:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

module.exports = {
  getStats,
  broadcastMessage,
  getAllUsers,
  getAllUsersWithPasswords,
  loginAsUser,
  toggleBlockUser,
  toggleVerifyUser,
  toggleRole,
  deleteUser
};
