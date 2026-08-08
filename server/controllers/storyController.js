const Story = require('../models/Story');
const User = require('../models/User');

// Создать новую историю
const createStory = async (req, res) => {
  try {
    const { mediaUrl, mediaType, text, backgroundColor } = req.body;
    const userId = req.user.id;

    if (!mediaUrl && !text) {
      return res.status(400).json({ message: 'История должна содержать текст или медиафайл' });
    }

    const story = new Story({
      userId,
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || (mediaUrl ? 'image' : 'text'),
      text: text || '',
      backgroundColor: backgroundColor || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
    });

    await story.save();
    
    const populatedStory = await Story.findById(story._id).populate('userId', 'username avatarUrl isVerified role');

    // Уведомляем подключенных пользователей через WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_story', populatedStory);
    }

    res.status(201).json(populatedStory);
  } catch (error) {
    console.error('Ошибка создания истории:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Получить активные истории всех пользователей (лента историй)
const getFeedStories = async (req, res) => {
  try {
    const now = new Date();

    // Находим все неистекшие истории
    const activeStories = await Story.find({ expiresAt: { $gt: now } })
      .populate('userId', 'username avatarUrl isVerified role status')
      .sort({ createdAt: 1 });

    // Группируем истории по пользователям
    const grouped = {};
    activeStories.forEach(story => {
      if (!story.userId) return;
      const uId = story.userId._id.toString();
      if (!grouped[uId]) {
        grouped[uId] = {
          user: story.userId,
          stories: []
        };
      }
      grouped[uId].stories.push(story);
    });

    res.status(200).json(Object.values(grouped));
  } catch (error) {
    console.error('Ошибка получения историй:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Получить истории конкретного пользователя
const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    const stories = await Story.find({
      userId,
      expiresAt: { $gt: now }
    }).populate('userId', 'username avatarUrl isVerified role').sort({ createdAt: 1 });

    res.status(200).json(stories);
  } catch (error) {
    console.error('Ошибка получения историй пользователя:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Отметить историю как просмотренную
const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user.id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'История не найдена' });
    }

    const alreadyViewed = story.views.some(v => v.userId.toString() === currentUserId);
    if (!alreadyViewed) {
      story.views.push({ userId: currentUserId });
      await story.save();
    }

    res.status(200).json({ message: 'История просмотрена', viewsCount: story.views.length });
  } catch (error) {
    console.error('Ошибка просмотра истории:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Удалить историю
const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user.id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'История не найдена' });
    }

    if (story.userId.toString() !== currentUserId && req.user.role !== 'admin' && req.user.username !== 'MilkyVIP') {
      return res.status(403).json({ message: 'У вас нет прав для удаления этой истории' });
    }

    await Story.findByIdAndDelete(storyId);

    const io = req.app.get('io');
    if (io) {
      io.emit('story_deleted', storyId);
    }

    res.status(200).json({ message: 'История удалена' });
  } catch (error) {
    console.error('Ошибка удаления истории:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

module.exports = {
  createStory,
  getFeedStories,
  getUserStories,
  viewStory,
  deleteStory
};
