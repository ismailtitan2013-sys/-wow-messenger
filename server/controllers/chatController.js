const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

const ensureOfficialChannel = async (userId) => {
  try {
    let milkyUser = await User.findOne({ username: 'MilkyVIP' });
    if (!milkyUser) {
      milkyUser = await User.findOne({ role: 'admin' });
    }
    const adminId = milkyUser ? milkyUser._id : userId;

    let channel = await Chat.findOne({ groupName: '📢 Обновления WoW Messenger' });
    if (!channel) {
      channel = await Chat.create({
        groupName: '📢 Обновления WoW Messenger',
        isGroup: true,
        isChannel: true,
        isReadOnly: true,
        participants: Array.from(new Set([adminId.toString(), userId.toString()])),
        admins: [adminId]
      });

      const postText = `📢 Официальный Канал Обновлений WoW Messenger! 🚀✨

Мы подготовили и добавили новые крутые обновления:

1. 📸 Вечные аватарки — Загруженные аватарки сохраняются прямо в базе данных и больше никогда не исчезают!
2. 🧹 Чистый Telegram-дизайн — Минималистичный и аккуратный интерфейс без лишних корон и квадратиков.
3. 🔍 Поиск по @username — Находите пользователей прямо по юзернейму с собачкой (@username).
4. ↩️ Ответы на сообщения (Reply) — Нажмите "Ответить" на любое сообщение с синей полоской цитаты.
5. 🛡️ Просмотр удалённых сообщений — Разработчики и администраторы всегда видят зачеркнутый оригинал удалённых сообщений.
6. 📢 Канал новостей — Только администраторы могут писать сообщения в этот канал!`;

      const initialMessage = await Message.create({
        chatId: channel._id,
        senderId: adminId,
        text: postText,
        content: postText,
        status: 'sent'
      });

      channel.lastMessage = initialMessage._id;
      await channel.save();
    } else {
      let shouldSave = false;
      const partStrs = channel.participants.map(p => p.toString());
      if (!partStrs.includes(userId.toString())) {
        channel.participants.push(userId);
        shouldSave = true;
      }
      if (milkyUser && !channel.admins.map(a => a.toString()).includes(milkyUser._id.toString())) {
        channel.admins.push(milkyUser._id);
        shouldSave = true;
      }
      if (shouldSave) await channel.save();
    }
  } catch (err) {
    console.error('Error ensuring official channel:', err);
  }
};

// Получить все чаты текущего пользователя
const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    await ensureOfficialChannel(userId);

    // Находим все чаты, где участвует этот пользователь
    const chats = await Chat.find({ participants: { $in: [userId] } })
      .populate('participants', 'username avatarUrl avatarFrame nameColor userTitle profileAura chatStyle badges coins activeTheme giftsReceived status bio role isVerified')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    // Отфильтровываем удаленные личные чаты (где один из собеседников был удален из базы)
    const validChats = chats.filter(chat => {
      if (chat.isGroup) return true;
      const validParticipants = chat.participants.filter(p => p !== null);
      return validParticipants.length >= 2;
    });

    res.status(200).json(validChats);
  } catch (error) {
    console.error('Ошибка при получении чатов:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Создать новый чат с пользователем или вернуть существующий
const createOrGetChat = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { targetUserId } = req.body;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: 'Нельзя создать чат с самим собой' });
    }

    // Проверяем, существует ли уже приватный чат между этими пользователями
    let chat = await Chat.findOne({
      isGroup: { $ne: true },
      participants: { $all: [currentUserId, targetUserId] }
    }).populate('participants', 'username avatarUrl avatarFrame nameColor userTitle profileAura chatStyle badges coins activeTheme giftsReceived status bio role isVerified');

    if (!chat) {
      // Создаем новый чат
      chat = new Chat({
        participants: [currentUserId, targetUserId]
      });
      await chat.save();
      chat = await chat.populate('participants', 'username avatarUrl avatarFrame nameColor userTitle profileAura chatStyle badges coins activeTheme giftsReceived status bio role isVerified');
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error('Ошибка при создании чата:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Получить историю сообщений для конкретного чата
const getChatMessages = async (req, res) => {
  try {
    const { id } = req.params; // id чата
    
    // Проверка доступа к чату
    const chat = await Chat.findById(id);
    if (!chat || !chat.participants.map(p => p.toString()).includes(req.user.id)) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const messages = await Message.find({ chatId: id }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Создать групповой чат или канал
const createGroupChat = async (req, res) => {
  try {
    const { users, name, isChannel } = req.body;
    if (!users || !name) {
      return res.status(400).json({ message: 'Заполните все поля' });
    }

    if (!users.includes(req.user.id)) {
      users.push(req.user.id);
    }

    const groupChat = await Chat.create({
      groupName: name,
      isGroup: true,
      isChannel: !!isChannel,
      isReadOnly: !!isChannel,
      participants: users,
      admins: [req.user.id]
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('participants', 'username avatarUrl avatarFrame nameColor userTitle profileAura chatStyle badges coins activeTheme giftsReceived status bio role isVerified')
      .populate('admins', 'username avatarUrl status isVerified');

    res.status(200).json(fullGroupChat);
  } catch (error) {
    console.error('Ошибка при создании группы/канала:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

module.exports = {
  getUserChats,
  createOrGetChat,
  getChatMessages,
  createGroupChat
};
