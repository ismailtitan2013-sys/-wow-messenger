const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

// Каталог предметов магазина
const STORE_ITEMS = {
  frames: [
    { id: 'frame_gold', name: 'Золотая Аура', price: 150, icon: '✨', description: 'Золотистый светящийся контур для аватарки' },
    { id: 'frame_neon', name: 'Неоновый Всплеск', price: 200, icon: '⚡', description: 'Яркое неон-голубое свечение' },
    { id: 'frame_fire', name: 'Пламенный Огонь', price: 250, icon: '🔥', description: 'Анимированное огненное обрамление' },
    { id: 'frame_cyber', name: 'Киберпанк', price: 300, icon: '🤖', description: 'Футуристический кибер-контур' },
    { id: 'frame_vip', name: 'Корона VIP', price: 500, icon: '👑', description: 'Эксклюзивная золотая корона над аватаркой' },
  ],
  nameColors: [
    { id: 'color_gold', name: 'Золотой', price: 100, color: '#f59e0b', cssClass: 'name-color-gold', description: 'Роскошный золотой цвет ника' },
    { id: 'color_neon_blue', name: 'Неоновый Синий', price: 120, color: '#3b82f6', cssClass: 'name-color-neon-blue', description: 'Яркий неоново-синий цвет' },
    { id: 'color_purple', name: 'Пурпурный Глянец', price: 150, color: '#a855f7', cssClass: 'name-color-purple', description: 'Сочный пурпурный глянец' },
    { id: 'color_emerald', name: 'Изумрудный', price: 200, color: '#10b981', cssClass: 'name-color-emerald', description: 'Благородный изумрудный цвет' },
    { id: 'color_rainbow', name: 'Радужный Градиент', price: 300, color: 'rainbow', cssClass: 'name-color-rainbow', description: 'Переливающийся всеми цветами радуги' },
  ],
  badges: [
    { id: 'badge_vip', name: 'VIP', price: 200, badge: 'VIP' },
    { id: 'badge_pioneer', name: 'Пионер', price: 150, badge: 'Пионер' },
    { id: 'badge_legend', name: 'Легенда', price: 400, badge: 'Легенда' },
    { id: 'badge_top', name: 'Топ', price: 250, badge: 'Топ' },
  ],
  themes: [
    { id: 'theme_tg_dark', name: 'Telegram Dark', price: 100, description: 'Классическая тёмная тема в стиле Telegram' },
    { id: 'theme_cyberpunk', name: 'Cyber Neon', price: 200, description: 'Футуристическая неоновая тема' },
    { id: 'theme_emerald', name: 'Изумрудная Ночь', price: 150, description: 'Глубокие изумрудно-зелёные тона' },
    { id: 'theme_sunset', name: 'Закат Солнца', price: 150, description: 'Теплые фиолетово-оранжевые градиенты' },
  ],
  gifts: [
    { id: 'gift_star', name: 'Звезда', price: 50, icon: '⭐' },
    { id: 'gift_heart', name: 'Сердце', price: 100, icon: '💖' },
    { id: 'gift_rocket', name: 'Ракета', price: 200, icon: '🚀' },
    { id: 'gift_crown', name: 'Корона', price: 500, icon: '👑' },
  ]
};

// Получение каталога магазина
const getStoreCatalog = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Привилегии разработчика для MilkyVIP
    if (user && (user.username === 'MilkyVIP' || user.role === 'admin')) {
      if ((user.coins || 0) < 999999) {
        user.coins = 999999;
        const ALL_ITEMS = [
          'frame_gold', 'frame_neon', 'frame_fire', 'frame_cyber', 'frame_vip',
          'color_gold', 'color_neon_blue', 'color_purple', 'color_emerald', 'color_rainbow',
          'badge_vip', 'badge_pioneer', 'badge_legend', 'badge_top',
          'theme_tg_dark', 'theme_cyberpunk', 'theme_emerald', 'theme_sunset'
        ];
        user.inventory = Array.from(new Set([...(user.inventory || []), ...ALL_ITEMS]));
        user.badges = Array.from(new Set([...(user.badges || []), 'Разраб', 'VIP', 'Легенда', 'Топ']));
        await user.save();
      }
    }

    res.status(200).json({
      catalog: STORE_ITEMS,
      userCoins: user.coins || 0,
      userInventory: user.inventory || [],
      equippedFrame: user.avatarFrame || 'none',
      equippedColor: user.nameColor || 'default',
      equippedTheme: user.activeTheme || 'default',
      equippedBadges: user.badges || [],
      giftsReceived: user.giftsReceived || [],
      canClaimDaily: !user.lastDailyClaim || (Date.now() - new Date(user.lastDailyClaim).getTime() >= 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    logger.error('Ошибка получения магазина:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Ежедневный бонус монет
const claimDailyBonus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const now = new Date();
    
    if (user.lastDailyClaim && (now.getTime() - new Date(user.lastDailyClaim).getTime() < 24 * 60 * 60 * 1000)) {
      return res.status(400).json({ message: 'Ежедневный бонус уже получен! Приходите завтра.' });
    }

    const bonusAmount = 25;
    user.coins = (user.coins || 0) + bonusAmount;
    user.lastDailyClaim = now;
    await user.save();

    logger.info(`User ${user.username} claimed daily bonus of ${bonusAmount} coins`);
    res.status(200).json({ message: `Вы получили +${bonusAmount} монет!`, coins: user.coins, lastDailyClaim: user.lastDailyClaim });
  } catch (error) {
    logger.error('Ошибка получения бонуса:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Покупка предмета
const buyItem = async (req, res) => {
  try {
    const { itemId, category } = req.body; // category: 'frames', 'nameColors', 'badges', 'themes'
    const user = await User.findById(req.user.id);
    
    // Находим предмет в каталоге
    const categoryItems = STORE_ITEMS[category];
    if (!categoryItems) {
      return res.status(400).json({ message: 'Категория не найдена' });
    }

    const item = categoryItems.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Предмет не найден' });
    }

    if (user.inventory && user.inventory.includes(itemId)) {
      return res.status(400).json({ message: 'Этот предмет уже куплен!' });
    }

    if ((user.coins || 0) < item.price) {
      return res.status(400).json({ message: `Недостаточно монет! Требуется ${item.price} монет.` });
    }

    // Списываем монеты и добавляем в инвентарь
    user.coins -= item.price;
    user.inventory.push(itemId);

    // Автоматически надеваем купленный предмет
    if (category === 'frames') user.avatarFrame = itemId;
    if (category === 'nameColors') user.nameColor = itemId;
    if (category === 'themes') user.activeTheme = itemId;
    if (category === 'badges' && item.badge) {
      if (!user.badges.includes(item.badge)) {
        user.badges.push(item.badge);
      }
    }

    await user.save();
    logger.info(`User ${user.username} bought ${itemId} for ${item.price} coins`);

    res.status(200).json({
      message: `Вы успешно купили "${item.name}"!`,
      coins: user.coins,
      inventory: user.inventory,
      user
    });
  } catch (error) {
    logger.error('Ошибка покупки предмета:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Экипировка/снятие предмета
const equipItem = async (req, res) => {
  try {
    const { itemId, category } = req.body;
    const user = await User.findById(req.user.id);

    if (itemId !== 'none' && itemId !== 'default' && (!user.inventory || !user.inventory.includes(itemId))) {
      return res.status(400).json({ message: 'У вас нет этого предмета!' });
    }

    if (category === 'frames') user.avatarFrame = itemId;
    if (category === 'nameColors') user.nameColor = itemId;
    if (category === 'themes') user.activeTheme = itemId;

    await user.save();
    res.status(200).json({ message: 'Настройки обновлены!', user });
  } catch (error) {
    logger.error('Ошибка экипировки предмета:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Перевод монет / Отправка подарка в чате
const sendGiftOrCoins = async (req, res) => {
  try {
    const { recipientId, giftId, coinsAmount, message, chatId } = req.body;
    const sender = await User.findById(req.user.id);
    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({ message: 'Получатель не найден' });
    }

    let gift = null;
    let totalCost = 0;

    if (giftId) {
      gift = STORE_ITEMS.gifts.find(g => g.id === giftId);
      if (!gift) return res.status(400).json({ message: 'Подарок не найден' });
      totalCost = gift.price;
    } else if (coinsAmount && coinsAmount > 0) {
      totalCost = Number(coinsAmount);
    } else {
      return res.status(400).json({ message: 'Укажите подарок или количество монет' });
    }

    if ((sender.coins || 0) < totalCost) {
      return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${totalCost}` });
    }

    // Списываем у отправителя и начисляем получателю
    sender.coins -= totalCost;
    recipient.coins = (recipient.coins || 0) + (gift ? Math.round(totalCost * 0.5) : totalCost); // За подарок часть конвертируется

    // Добавляем подарок в список полученных
    if (gift) {
      recipient.giftsReceived.push({
        fromUserId: sender._id.toString(),
        fromUsername: sender.username,
        giftType: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        coins: gift.price,
        message: message || ''
      });
    }

    await sender.save();
    await recipient.save();

    // Создаем системное сообщение в чате
    let systemMsgContent = gift
      ? `🎁 ${sender.username} подарил(а) ${gift.icon} ${gift.name} пользователю ${recipient.username}! ${message ? `("${message}")` : ''}`
      : `🪙 ${sender.username} перевёл(а) 🪙 ${totalCost} монет пользователю ${recipient.username}! ${message ? `("${message}")` : ''}`;

    let createdMessage = null;
    if (chatId) {
      createdMessage = await Message.create({
        chatId,
        senderId: sender._id,
        content: systemMsgContent,
        mediaType: 'text',
        readBy: [sender._id]
      });
      await Chat.findByIdAndUpdate(chatId, { lastMessage: createdMessage._id, updatedAt: Date.now() });
    }

    // Отправляем socket событие о подарке
    const io = req.app.get('io');
    if (io && chatId) {
      const populatedMsg = await Message.findById(createdMessage._id).populate('senderId', 'username avatarUrl avatarFrame nameColor status role');
      io.to(chatId).emit('message_received', populatedMsg);
      io.emit('coins_updated', { userId: recipient._id, newCoins: recipient.coins });
      io.emit('coins_updated', { userId: sender._id, newCoins: sender.coins });
    }

    logger.info(`Gift/Coins sent from ${sender.username} to ${recipient.username}: ${totalCost} coins`);
    res.status(200).json({ message: 'Подарок успешно отправлен!', senderCoins: sender.coins });
  } catch (error) {
    logger.error('Ошибка отправки подарка:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

module.exports = {
  getStoreCatalog,
  claimDailyBonus,
  buyItem,
  equipItem,
  sendGiftOrCoins,
  STORE_ITEMS
};
