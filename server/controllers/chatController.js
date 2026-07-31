const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

// Получить все чаты текущего пользователя
const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    // Находим все чаты, где участвует этот пользователь
    const chats = await Chat.find({ participants: { $in: [userId] } })
      .populate('participants', 'username avatarUrl status bio role isVerified')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json(chats);
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

    // Проверяем, существует ли уже чат между этими пользователями
    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, targetUserId] }
    }).populate('participants', 'username avatarUrl status bio role isVerified');

    if (!chat) {
      // Создаем новый чат
      chat = new Chat({
        participants: [currentUserId, targetUserId]
      });
      await chat.save();
      chat = await chat.populate('participants', 'username avatarUrl status bio role isVerified');
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
    
    // Проверка доступа к чату (опционально, но желательно)
    const chat = await Chat.findById(id);
    if (!chat || !chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const messages = await Message.find({ chatId: id }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Создать групповой чат
const createGroupChat = async (req, res) => {
  try {
    const { users, name } = req.body;
    if (!users || !name) {
      return res.status(400).json({ message: 'Заполните все поля' });
    }

    if (users.length < 2) {
      return res.status(400).json({ message: 'В группе должно быть больше 2 участников (включая вас)' });
    }

    // Добавляем создателя в участники
    users.push(req.user.id);

    const groupChat = await Chat.create({
      groupName: name,
      isGroup: true,
      participants: users,
      admins: [req.user.id]
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('participants', 'username avatarUrl status bio role isVerified')
      .populate('admins', 'username avatarUrl status isVerified');

    res.status(200).json(fullGroupChat);
  } catch (error) {
    console.error('Ошибка при создании группы:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

module.exports = {
  getUserChats,
  createOrGetChat,
  getChatMessages,
  createGroupChat
};
