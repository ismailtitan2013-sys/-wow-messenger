const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

// Исламский расширенный каталог халяльных предметов и 26+ разных подарков
const STORE_ITEMS = {
  frames: [
    { id: 'frame_gold', name: 'Золотая Аура', price: 150, icon: '✨', description: 'Золотистый светящийся контур' },
    { id: 'frame_neon', name: 'Неоновый Всплеск', price: 200, icon: '⚡', description: 'Чистое неон-голубое свечение' },
    { id: 'frame_fire', name: 'Пламенный Огонь', price: 250, icon: '🔥', description: 'Теплое огненное обрамление' },
    { id: 'frame_cyber', name: 'Киберпанк', price: 300, icon: '🤖', description: 'Футуристический технологичный контур' },
    { id: 'frame_vip', name: 'Корона Мецената', price: 500, icon: '👑', description: 'Почетная корона над аватаркой' },
    { id: 'frame_diamond', name: 'Изумрудный Свет', price: 1000, icon: '💎', description: 'Сияющие грани добродетели' },
    { id: 'frame_galaxy', name: 'Звездный Свет', price: 2500, icon: '🌌', description: 'Свет ночного неба' },
  ],
  nameColors: [
    { id: 'color_gold', name: 'Благородный Золотой', price: 100, color: '#f59e0b', cssClass: 'name-color-gold', description: 'Золотистый цвет ника' },
    { id: 'color_neon_blue', name: 'Неоновый Синий', price: 120, color: '#3b82f6', cssClass: 'name-color-neon-blue', description: 'Яркий небесно-синий цвет' },
    { id: 'color_purple', name: 'Пурпурный Глянец', price: 150, color: '#a855f7', cssClass: 'name-color-purple', description: 'Благородный пурпурный' },
    { id: 'color_emerald', name: 'Изумрудный (Священный)', price: 200, color: '#10b981', cssClass: 'name-color-emerald', description: 'Благородный зеленый изумруд' },
    { id: 'color_rainbow', name: 'Радужный Градиент', price: 300, color: 'rainbow', cssClass: 'name-color-rainbow', description: 'Красочный градиент' },
    { id: 'color_fire', name: 'Огненный Градиент', price: 500, color: 'fire', cssClass: 'name-color-fire', description: 'Яркий красно-оранжевый ник' },
  ],
  badges: [
    { id: 'badge_vip', name: 'VIP Меценат', price: 200, badge: 'VIP' },
    { id: 'badge_pioneer', name: 'Пионер', price: 150, badge: 'Пионер' },
    { id: 'badge_legend', name: 'Легенда', price: 400, badge: 'Легенда' },
    { id: 'badge_top', name: 'Почетный Участник', price: 250, badge: 'Топ' },
    { id: 'badge_billionaire', name: 'Щедрый Меценат', price: 5000, badge: 'Меценат' },
    { id: 'badge_god', name: 'Создатель & Хранитель', price: 10000, badge: 'Создатель' },
  ],
  themes: [
    { id: 'theme_tg_dark', name: 'Telegram Dark', price: 100, description: 'Тёмная гармоничная тема' },
    { id: 'theme_cyberpunk', name: 'Cyber Neon', price: 200, description: 'Неоновая тема' },
    { id: 'theme_emerald', name: 'Изумрудный Оазис', price: 150, description: 'Умиротворяющие зеленые тона' },
    { id: 'theme_sunset', name: 'Теплый Закат', price: 150, description: 'Теплые градиенты заката' },
    { id: 'theme_gold', name: 'Золотой Люкс', price: 500, description: 'Премиальное золотое оформление' },
  ],
  gifts: [
    { id: 'gift_dates', name: 'Финиковая Пальма', price: 50, icon: '🌴', description: 'Символ благословения (Баракат)' },
    { id: 'gift_coffee', name: 'Арабский Кофе', price: 100, icon: '☕', description: 'Символ гостеприимства' },
    { id: 'gift_rose', name: 'Букет Алых Роз', price: 120, icon: '🌺', description: 'Искреннее уважение' },
    { id: 'gift_pizza', name: 'Вкусная Пицца', price: 150, icon: '🍕', description: 'Дружеское угощение' },
    { id: 'gift_book', name: 'Книга Знаний', price: 200, icon: '📖', description: 'Полезные знания' },
    { id: 'gift_cake', name: 'Праздничный Торт', price: 250, icon: '🎂', description: 'Сладкое поздравление' },
    { id: 'gift_magic_box', name: 'Шкатулка Желаний', price: 300, icon: '🎁', description: 'Добрый подарок' },
    { id: 'gift_crescent', name: 'Свет Полумесяца', price: 500, icon: '🌙', description: 'Свет гармонии' },
    { id: 'gift_trophy', name: 'Золотой Кубок', price: 750, icon: '🏆', description: 'Награда за достоинство' },
    { id: 'gift_rocket', name: 'Космическая Ракета', price: 800, icon: '🚀', description: 'Стремление к вышине' },
    { id: 'gift_mosque', name: 'Благородная Мечеть', price: 1000, icon: '🕌', description: 'Символ мира и духовности' },
    { id: 'gift_watch', name: 'Швейцарские Часы', price: 1500, icon: '⌚', description: 'Ценность времени' },
    { id: 'gift_emerald', name: 'Сияющий Изумруд', price: 2500, icon: '💎', description: 'Честный драгоценный камень' },
    { id: 'gift_ring', name: 'Алмазный Перстень', price: 3000, icon: '💍', description: 'Символ верности' },
    { id: 'gift_car', name: 'Благородный Автомобиль', price: 5000, icon: '🏎️', description: 'Полезный транспорт' },
    { id: 'gift_tiger', name: 'Благородный Тигр', price: 7000, icon: '🐅', description: 'Символ силы и храбрости' },
    { id: 'gift_horse', name: 'Арабский Скакун', price: 8500, icon: '🏇', description: 'Быстрый верный конь' },
    { id: 'gift_yacht', name: 'Морская Яхта', price: 10000, icon: '🛥️', description: 'Путешествие по морям' },
    { id: 'gift_sword', name: 'Меч Почета', price: 12000, icon: '🗡️', description: 'Символ чести и заступничества' },
    { id: 'gift_palace', name: 'Дом Гостеприимства', price: 15000, icon: '🏰', description: 'Просторный дом' },
    { id: 'gift_airplane', name: 'Личный Самолет', price: 25000, icon: '🛩️', description: 'Полет над облаками' },
    { id: 'gift_crown', name: 'Корона Почета', price: 50000, icon: '👑', description: 'Знак высочайшего уважения' },
    { id: 'gift_planet', name: 'Собственная Планета', price: 100000, icon: '🪐', description: 'Целый мир' },
    { id: 'gift_supernova', name: 'Вспышка Суперновой', price: 200000, icon: '💫', description: 'Великий свет' },
    { id: 'gift_charity_box', name: 'Сокровищница Садака', price: 250000, icon: '📦', description: 'Великое меценатство' },
    { id: 'gift_universe', name: 'Вселенная Мечты', price: 500000, icon: '🌌', description: 'Бесконечный космос' }
  ]
};

// Сбалансированный список заданий
const QUESTS_LIST = [
  { id: 'quest_first_msg', title: '💬 Пожелать мира в чате', reward: 50, icon: '💬', desc: 'Отправьте приветствие в любой чат' },
  { id: 'quest_send_gift', title: '🎁 Сделать подарок / Садака', reward: 100, icon: '🎁', desc: 'Подарите подарок другу' },
  { id: 'quest_click_100', title: '⚡ Заработать 100 монет трудом', reward: 150, icon: '⚡', desc: 'Натапайте 100 монет в кликере' },
  { id: 'quest_quiz', title: '📖 Пройти Викторину Знаний', reward: 200, icon: '📖', desc: 'Ответьте правильно на вопросы викторины' },
  { id: 'quest_milky_fan', title: '👑 Поприветствовать Мецената MilkyVIP', reward: 500, icon: '👑', desc: 'Отдайте дань уважения MilkyVIP' },
];

// Вопросы для Викторины Полезных Знаний
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'Что является главным символом гостеприимства на Востоке?',
    options: ['Арабский кофе и финики', 'Кола', 'Чипсы'],
    correct: 0,
    reward: 50
  },
  {
    id: 2,
    question: 'Какое приветствие означает пожелание мира?',
    options: ['Ассаляму алейкум', 'Привет', 'Хеллоу'],
    correct: 0,
    reward: 50
  },
  {
    id: 3,
    question: 'Как называется добровольная искренняя милостыня и подарок ради добра?',
    options: ['Садака', 'Кредит', 'Процент'],
    correct: 0,
    reward: 100
  },
  {
    id: 4,
    question: 'Запрещена ли в Исламе азартная игра (Майсир) и ставка на случайность?',
    options: ['Да, запрещена (Харам)', 'Нет, разрешена', 'Не знаю'],
    correct: 0,
    reward: 150
  }
];

// Проверка MilkyVIP (Главный Меценат и Создатель)
const checkMilkyVIP = async (user) => {
  if (!user) return;
  if (user.username.toLowerCase() === 'milkyvip' || user.role === 'admin') {
    user.coins = 999999999;
    user.isVerified = true;
    user.role = 'admin';
    const ALL_ITEMS = [
      'frame_gold', 'frame_neon', 'frame_fire', 'frame_cyber', 'frame_vip', 'frame_diamond', 'frame_galaxy',
      'color_gold', 'color_neon_blue', 'color_purple', 'color_emerald', 'color_rainbow', 'color_fire',
      'badge_vip', 'badge_pioneer', 'badge_legend', 'badge_top', 'badge_billionaire', 'badge_god',
      'theme_tg_dark', 'theme_cyberpunk', 'theme_emerald', 'theme_sunset', 'theme_gold'
    ];
    user.inventory = Array.from(new Set([...(user.inventory || []), ...ALL_ITEMS]));
    user.badges = Array.from(new Set([...(user.badges || []), 'Создатель', 'MilkyVIP', 'Меценат', 'Разраб', 'VIP', 'Легенда']));
    await user.save();
  }
};

// Получение каталога магазина и данных о балансе
const getStoreCatalog = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const now = Date.now();
    const lastDaily = user.lastDailyClaim ? new Date(user.lastDailyClaim).getTime() : 0;
    const canClaimDaily = (now - lastDaily) >= 24 * 60 * 60 * 1000;

    res.status(200).json({
      catalog: STORE_ITEMS,
      quests: QUESTS_LIST,
      quizQuestions: QUIZ_QUESTIONS,
      userCoins: user.coins || 0,
      userInventory: user.inventory || [],
      equippedFrame: user.avatarFrame || 'none',
      equippedColor: user.nameColor || 'default',
      equippedTheme: user.activeTheme || 'default',
      equippedBadges: user.badges || [],
      giftsReceived: user.giftsReceived || [],
      completedQuests: user.completedQuests || [],
      clickerLevel: user.clickerLevel || 1,
      canClaimDaily,
      dailyStreak: user.dailyStreak || 0
    });
  } catch (error) {
    logger.error('Ошибка получения магазина:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Сбалансированный ежедневный бонус
const claimDailyBonus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const now = new Date();
    const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;

    if (lastClaim && (now.getTime() - lastClaim.getTime() < 24 * 60 * 60 * 1000)) {
      return res.status(400).json({ message: 'Ежедневный подарок уже получен! Приходите завтра.' });
    }

    let streak = user.dailyStreak || 0;
    if (lastClaim && (now.getTime() - lastClaim.getTime() < 48 * 60 * 60 * 1000)) {
      streak += 1;
    } else {
      streak = 1;
    }

    // Реалистичный сбалансированный бонус: 50 * стрик (макс 300 монет)
    const bonusAmount = Math.min(300, 50 * streak);
    user.coins = (user.coins || 0) + bonusAmount;
    user.lastDailyClaim = now;
    user.dailyStreak = streak;

    await user.save();
    await checkMilkyVIP(user);

    logger.info(`User ${user.username} claimed daily bonus of ${bonusAmount} coins (Streak: ${streak})`);
    res.status(200).json({ 
      message: `🌙 Вы получили подарок +${bonusAmount} монет! (Дней подряд: ${streak})`, 
      coins: user.coins, 
      lastDailyClaim: user.lastDailyClaim,
      dailyStreak: streak 
    });
  } catch (error) {
    logger.error('Ошибка получения бонуса:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Сбалансированный кликер честного труда (1 тап = +1 + level - 1 монета)
const tapCoins = async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const isMilky = user.username.toLowerCase() === 'milkyvip';
    const safeCount = Math.min(20, Math.max(1, Number(count)));
    const level = user.clickerLevel || 1;
    
    // Сбалансированная доходность: Lv.1 -> +1, Lv.2 -> +2, Lv.3 -> +3
    const coinsPerTap = isMilky ? 10000000 : (1 + (level - 1));
    const earned = safeCount * coinsPerTap;

    user.coins = (user.coins || 0) + earned;
    await user.save();
    await checkMilkyVIP(user);

    res.status(200).json({
      earned,
      coins: user.coins,
      clickerLevel: user.clickerLevel || 1
    });
  } catch (error) {
    logger.error('Ошибка кликера труда:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Прокачка уровня кликера (Реалистичная экономическая прогрессия)
const upgradeClicker = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const currentLevel = user.clickerLevel || 1;
    // Стоимость прокачки: Lv.1 -> Lv.2: 500, Lv.2 -> Lv.3: 1500, Lv.3 -> Lv.4: 4500
    const upgradeCost = Math.round(Math.pow(currentLevel, 1.8) * 500);

    if ((user.coins || 0) < upgradeCost && user.username.toLowerCase() !== 'milkyvip') {
      return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${upgradeCost}` });
    }

    if (user.username.toLowerCase() !== 'milkyvip') {
      user.coins -= upgradeCost;
    }
    user.clickerLevel = currentLevel + 1;
    await user.save();
    await checkMilkyVIP(user);

    res.status(200).json({
      message: `⚡ Уровень мастерства повышен до Lv. ${user.clickerLevel}!`,
      clickerLevel: user.clickerLevel,
      coins: user.coins
    });
  } catch (error) {
    logger.error('Ошибка улучшения умения:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Викторина Знаний
const answerQuiz = async (req, res) => {
  try {
    const { questionId, answerIndex } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const q = QUIZ_QUESTIONS.find(item => item.id === questionId);
    if (!q) {
      return res.status(404).json({ message: 'Вопрос не найден' });
    }

    if (q.correct !== Number(answerIndex)) {
      return res.status(400).json({ message: 'Неверный ответ! Попробуйте еще раз.' });
    }

    const reward = q.reward || 50;
    user.coins = (user.coins || 0) + reward;

    if (user.completedQuests && !user.completedQuests.includes('quest_quiz')) {
      user.completedQuests.push('quest_quiz');
    }

    await user.save();
    await checkMilkyVIP(user);

    logger.info(`User ${user.username} answered quiz correctly and earned ${reward} coins`);
    res.status(200).json({
      message: `📖 Правильно! Вы получили +🪙 ${reward} монет за знания!`,
      coins: user.coins,
      reward
    });
  } catch (error) {
    logger.error('Ошибка в викторине:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Забор задания
const claimQuest = async (req, res) => {
  try {
    const { questId } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const quest = QUESTS_LIST.find(q => q.id === questId);
    if (!quest) {
      return res.status(404).json({ message: 'Задание не найдено' });
    }

    if (user.completedQuests && user.completedQuests.includes(questId)) {
      return res.status(400).json({ message: 'Награда за это благое дело уже получена!' });
    }

    user.completedQuests = user.completedQuests || [];
    user.completedQuests.push(questId);
    user.coins = (user.coins || 0) + quest.reward;

    await user.save();
    await checkMilkyVIP(user);

    res.status(200).json({
      message: `🎉 Задание "${quest.title}" выполнено! Получено +🪙 ${quest.reward}`,
      coins: user.coins,
      completedQuests: user.completedQuests
    });
  } catch (error) {
    logger.error('Ошибка забора задания:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Покупка предмета
const buyItem = async (req, res) => {
  try {
    const { itemId, category } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const categoryItems = STORE_ITEMS[category];
    if (!categoryItems) {
      return res.status(400).json({ message: 'Категория не найдена' });
    }

    const item = categoryItems.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Предмет не найден' });
    }

    if (user.inventory && user.inventory.includes(itemId)) {
      return res.status(400).json({ message: 'Этот предмет уже приобритен!' });
    }

    if ((user.coins || 0) < item.price && user.username.toLowerCase() !== 'milkyvip') {
      return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${item.price}` });
    }

    if (user.username.toLowerCase() !== 'milkyvip') {
      user.coins -= item.price;
    }
    user.inventory.push(itemId);

    if (category === 'frames') user.avatarFrame = itemId;
    if (category === 'nameColors') user.nameColor = itemId;
    if (category === 'themes') user.activeTheme = itemId;
    if (category === 'badges' && item.badge) {
      if (!user.badges.includes(item.badge)) {
        user.badges.push(item.badge);
      }
    }

    await user.save();
    await checkMilkyVIP(user);
    logger.info(`User ${user.username} bought ${itemId} for ${item.price} coins`);

    res.status(200).json({
      message: `Вы успешно приобрели "${item.name}"!`,
      coins: user.coins,
      inventory: user.inventory,
      user
    });
  } catch (error) {
    logger.error('Ошибка покупки предмета:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Экипировка предмета
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

// Перевод монет и отправка подарков
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

    if ((sender.coins || 0) < totalCost && sender.username.toLowerCase() !== 'milkyvip') {
      return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${totalCost}` });
    }

    if (sender.username.toLowerCase() !== 'milkyvip') {
      sender.coins -= totalCost;
    }
    
    recipient.coins = (recipient.coins || 0) + totalCost;

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
      if (sender.completedQuests && !sender.completedQuests.includes('quest_send_gift')) {
        sender.completedQuests.push('quest_send_gift');
        sender.coins += 100;
      }
    }

    await sender.save();
    await recipient.save();
    await checkMilkyVIP(sender);

    let systemMsgContent = gift
      ? `🎁 ${sender.username} преподнес(ла) подарок ${gift.icon} ${gift.name} пользователю ${recipient.username}! ${message ? `("${message}")` : ''}`
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
  tapCoins,
  upgradeClicker,
  answerQuiz,
  claimQuest,
  buyItem,
  equipItem,
  sendGiftOrCoins,
  STORE_ITEMS,
  QUESTS_LIST,
  QUIZ_QUESTIONS
};
