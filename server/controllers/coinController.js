const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

// Расширенный каталог предметов и 26+ разных подарков
const STORE_ITEMS = {
  frames: [
    { id: 'frame_gold', name: 'Золотая Аура', price: 1500, icon: '✨', description: 'Золотистый светящийся контур' },
    { id: 'frame_neon', name: 'Неоновый Всплеск', price: 2500, icon: '⚡', description: 'Чистое неон-голубое свечение' },
    { id: 'frame_fire', name: 'Пламенный Огонь', price: 4000, icon: '🔥', description: 'Теплое огненное обрамление' },
    { id: 'frame_cyber', name: 'Киберпанк', price: 6000, icon: '🤖', description: 'Футуристический технологичный контур' },
    { id: 'frame_vip', name: 'Корона Мецената', price: 10000, icon: '👑', description: 'Почетная корона над аватаркой' },
    { id: 'frame_diamond', name: 'Изумрудный Свет', price: 25000, icon: '💎', description: 'Сияющие грани добродетели' },
    { id: 'frame_galaxy', name: 'Звездный Свет', price: 50000, icon: '🌌', description: 'Свет ночного неба' },
  ],
  nameColors: [
    { id: 'color_gold', name: 'Благородный Золотой', price: 1000, color: '#f59e0b', cssClass: 'name-color-gold', description: 'Золотистый цвет ника' },
    { id: 'color_neon_blue', name: 'Неоновый Синий', price: 1500, color: '#3b82f6', cssClass: 'name-color-neon-blue', description: 'Яркий небесно-синий цвет' },
    { id: 'color_purple', name: 'Пурпурный Глянец', price: 2000, color: '#a855f7', cssClass: 'name-color-purple', description: 'Благородный пурпурный' },
    { id: 'color_emerald', name: 'Изумрудный (Священный)', price: 3000, color: '#10b981', cssClass: 'name-color-emerald', description: 'Благородный зеленый изумруд' },
    { id: 'color_rainbow', name: 'Радужный Градиент', price: 7500, color: 'rainbow', cssClass: 'name-color-rainbow', description: 'Красочный градиент' },
    { id: 'color_fire', name: 'Огненный Градиент', price: 10000, color: 'fire', cssClass: 'name-color-fire', description: 'Яркий красно-оранжевый ник' },
  ],
  badges: [
    { id: 'badge_pioneer', name: 'Пионер', price: 2000, badge: 'Пионер' },
    { id: 'badge_vip', name: 'VIP Меценат', price: 2500, badge: 'VIP' },
    { id: 'badge_top', name: 'Почетный Участник', price: 5000, badge: 'Топ' },
    { id: 'badge_legend', name: 'Легенда', price: 15000, badge: 'Легенда' },
    { id: 'badge_billionaire', name: 'Щедрый Меценат', price: 50000, badge: 'Меценат' },
    { id: 'badge_creator', name: 'Создатель & Хранитель', price: 150000, badge: 'Создатель' },
  ],
  titles: [
    { id: 'title_vladyka', name: '👑 Владыка', price: 50000, title: '👑 Владыка', description: 'Абсолютный верховный правитель' },
    { id: 'title_phoenix', name: '💎 Феникс', price: 30000, title: '💎 Феникс', description: 'Бессмертный священный огонь' },
    { id: 'title_cybergod', name: '⚡ Кибер-Мастер', price: 25000, title: '⚡ Кибер-Мастер', description: 'Повелитель виртуальной реальности' },
    { id: 'title_cosmos', name: '🌌 Космос', price: 20000, title: '🌌 Космос', description: 'Бесконечная галактическая сила' },
    { id: 'title_archon', name: '⚔️ Архонт', price: 15000, title: '⚔️ Архонт', description: 'Великий страж и воин света' },
    { id: 'title_sheikh', name: '👑 Шейх', price: 12000, title: '👑 Шейх', description: 'Почетный мудрый правитель' },
    { id: 'title_dragon', name: '🔥 Дракон', price: 10000, title: '🔥 Дракон', description: 'Несокрушимое пламя дракона' },
    { id: 'title_phantom', name: '☠️ Призрак', price: 7500, title: '☠️ Призрак', description: 'Теневой повелитель ночи' },
    { id: 'title_starlord', name: '🛸 Старлорд', price: 5000, title: '🛸 Старлорд', description: 'Капитан звездного флота' },
    { id: 'title_titan', name: '✨ Титан', price: 3000, title: '✨ Титан', description: 'Могущественный древний гигант' },
  ],
  auras: [
    { id: 'aura_gold', name: '✨ Золотая Аура', price: 3000, description: 'Сияющие золотистые частицы вокруг профиля' },
    { id: 'aura_neon', name: '⚡ Неоновый Пульс', price: 5000, description: 'Пульсирующее неон-свечение профиля' },
    { id: 'aura_fire', name: '🔥 Огненный Всплеск', price: 10000, description: 'Пламенная пылающая аура вокруг профиля' },
    { id: 'aura_cosmic', name: '🌌 Космический Взрыв', price: 30000, description: 'Звездная галактическая аура' },
  ],
  chatStyles: [
    { id: 'chat_gold', name: '👑 Золотые Сообщения', price: 5000, description: 'Премиальный золотой градиент ваших сообщений' },
    { id: 'chat_neon', name: '⚡ Неоновый Чат', price: 7500, description: 'Яркое неоновое свечение облачка сообщения' },
    { id: 'chat_emerald', name: '🌿 Изумрудные Сообщения', price: 3500, description: 'Благородный изумрудно-зеленый стиль' },
  ],
  gifts: [
    { id: 'gift_star', name: 'Telegram Star', price: 500, icon: '⭐️', rarity: 'Limited', totalIssued: 5000, description: 'Официальная звезда Telegram' },
    { id: 'gift_bear', name: 'Plush Bear', price: 1500, icon: '🧸', rarity: 'Rare', totalIssued: 2500, description: 'Коллекционный плюшевый мишка' },
    { id: 'gift_heart', name: 'Crystal Heart', price: 2500, icon: '💖', rarity: 'Rare', totalIssued: 1500, description: 'Хрустальное сияющее сердце' },
    { id: 'gift_ring', name: 'Diamond Ring', price: 5000, icon: '💍', rarity: 'Epic', totalIssued: 1000, description: 'Алмазный перстень мецената' },
    { id: 'gift_rocket', name: 'Cosmic Rocket', price: 10000, icon: '🚀', rarity: 'Epic', totalIssued: 500, description: 'Сверхзвуковая ракета' },
    { id: 'gift_crown', name: 'Imperial Crown', price: 25000, icon: '👑', rarity: 'Legendary', totalIssued: 250, description: 'Императорская корона владыки' },
    { id: 'gift_car', name: 'Cyber Roadster', price: 50000, icon: '🏎️', rarity: 'Exclusive', totalIssued: 100, description: 'Эксклюзивный спорткар' },
    { id: 'gift_yacht', name: 'Luxury Yacht', price: 100000, icon: '🛥️', rarity: 'Exclusive', totalIssued: 50, description: 'Морская суперъяхта' },
    { id: 'gift_planet', name: 'Golden Planet', price: 250000, icon: '🪐', rarity: 'Unique', totalIssued: 10, description: 'Уникальная золотая планета' }
  ]
};

// Сбалансированный список заданий с реалистичными сложными наградами
const QUESTS_LIST = [
  { id: 'quest_first_msg', title: '💬 Пожелать мира в чате', reward: 5, icon: '💬', desc: 'Отправьте приветствие в любой чат' },
  { id: 'quest_send_gift', title: '🎁 Сделать подарок другу', reward: 10, icon: '🎁', desc: 'Подарите подарок другу' },
  { id: 'quest_click_100', title: '⚡ Заработать 100 монет трудом', reward: 15, icon: '⚡', desc: 'Натапайте 100 монет в кликере' },
  { id: 'quest_quiz', title: '📖 Пройти Викторину Знаний', reward: 15, icon: '📖', desc: 'Ответьте правильно на вопросы викторины' },
  { id: 'quest_milky_fan', title: '👑 Поприветствовать Мецената MilkyVIP', reward: 25, icon: '👑', desc: 'Отдайте дань уважения MilkyVIP' },
];

// Вопросы для Викторины Полезных Знаний
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'Что является традиционным символом уюта и гостеприимства?',
    options: ['Горячий ароматный кофе', 'Кола', 'Чипсы'],
    correct: 0,
    reward: 3
  },
  {
    id: 2,
    question: 'Какое приветствие означает дружеское пожелание мира?',
    options: ['Приветствие мира', 'Привет', 'Хеллоу'],
    correct: 0,
    reward: 3
  },
  {
    id: 3,
    question: 'Как называется добровольная поддержка и милостыня ради добра?',
    options: ['Благотворительность', 'Кредит', 'Процент'],
    correct: 0,
    reward: 5
  },
  {
    id: 4,
    question: 'Честны ли азартные игры и быстрые рискованные ставки?',
    options: ['Нет, это опасный риск и обман', 'Да, вполне', 'Не знаю'],
    correct: 0,
    reward: 10
  }
];

// Проверка MilkyVIP (Главный Меценат и Создатель)
const checkMilkyVIP = async (user) => {
  if (!user) return;
  if (user.username.toLowerCase() === 'milkyvip' || user.role === 'admin') {
    user.isVerified = true;
    user.role = 'admin';
    const ALL_ITEMS = [
      'frame_gold', 'frame_neon', 'frame_fire', 'frame_cyber', 'frame_vip', 'frame_diamond', 'frame_galaxy',
      'color_gold', 'color_neon_blue', 'color_purple', 'color_emerald', 'color_rainbow', 'color_fire',
      'badge_vip', 'badge_pioneer', 'badge_legend', 'badge_top', 'badge_billionaire', 'badge_creator',
      'title_sultan', 'title_oligarch', 'aura_gold', 'aura_cosmic', 'chat_gold'
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
      equippedTitle: user.userTitle || '',
      equippedAura: user.profileAura || 'none',
      equippedChatStyle: user.chatStyle || 'default',
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

// Сложный ежедневный бонус (максимум +15 монет при стрике!)
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

    // Трудный бонус: 5 монет * стрик (максимум 15 монет)
    const bonusAmount = Math.min(15, 5 * streak);
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

// Сложный кликер честного труда (10 тапов = 1 монета!)
const tapCoins = async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const safeCount = Math.min(20, Math.max(1, Number(count)));
    const level = user.clickerLevel || 1;
    
    // Трудная кликерная прогрессия: 10 тапов = 1 монета на Lv.1
    const earned = Math.max(1, Math.round(safeCount * 0.1 * level));

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

    if ((user.coins || 0) < upgradeCost) {
      return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${upgradeCost}` });
    }

    user.coins -= upgradeCost;
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

    if ((user.coins || 0) < item.price) {
      return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${item.price}` });
    }

    user.coins -= item.price;
    user.inventory.push(itemId);

    // 10% комиссия Создателю ("мне") с каждой покупки в магазине
    const commission = Math.max(1, Math.round(item.price * 0.10));
    let adminUser = await User.findOne({ username: { $regex: new RegExp('^milkyvip$', 'i') } }) || await User.findOne({ role: 'admin' });
    if (adminUser && adminUser._id.toString() !== user._id.toString()) {
      adminUser.coins = (adminUser.coins || 0) + commission;
      await adminUser.save();
      const io = req.app.get('io');
      if (io) {
        io.emit('coins_updated', { userId: adminUser._id, newCoins: adminUser.coins });
      }
    }

    if (category === 'frames') user.avatarFrame = itemId;
    if (category === 'nameColors') user.nameColor = itemId;
    if (category === 'themes') user.activeTheme = itemId;
    if (category === 'titles') {
      const itemObj = (STORE_ITEMS.titles || []).find(t => t.id === itemId);
      user.userTitle = itemObj ? itemObj.title : '';
    }
    if (category === 'auras') user.profileAura = itemId;
    if (category === 'chatStyles') user.chatStyle = itemId;
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
    if (category === 'titles') {
      const itemObj = (STORE_ITEMS.titles || []).find(t => t.id === itemId);
      user.userTitle = itemId === 'none' || itemId === 'default' ? '' : (itemObj ? itemObj.title : '');
    }
    if (category === 'auras') user.profileAura = itemId;
    if (category === 'chatStyles') user.chatStyle = itemId;

    await user.save();
    res.status(200).json({ message: 'Настройки обновлены!', user });
  } catch (error) {
    logger.error('Ошибка экипировки предмета:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Перевод монет и отправка подарков С КОМИССИЕЙ 10% В ПОЛЬЗУ АДМИНИСТРАТОРА
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

    // Расчет комиссии 10%
    const commissionRate = 0.10;
    const commission = Math.max(1, Math.round(totalCost * commissionRate));

    // Ищем главного администратора ("мне")
    let adminUser = await User.findOne({ username: { $regex: new RegExp('^milkyvip$', 'i') } });
    if (!adminUser) {
      adminUser = await User.findOne({ role: 'admin' });
    }

    const isSenderAdmin = adminUser && adminUser._id.toString() === sender._id.toString();
    const actualCommission = isSenderAdmin ? 0 : commission;
    const netReceived = totalCost - actualCommission;

    // Списания и зачисления
    sender.coins -= totalCost;
    recipient.coins = (recipient.coins || 0) + netReceived;

    // Начисление комиссии администратору ("мне")
    if (adminUser && actualCommission > 0 && adminUser._id.toString() !== recipient._id.toString()) {
      adminUser.coins = (adminUser.coins || 0) + actualCommission;
      await adminUser.save();
    }

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
      ? `🎁 ${sender.username} преподнес(ла) подарок ${gift.icon} ${gift.name} пользователю ${recipient.username}! ${actualCommission > 0 ? `(Комиссия 10%: 🪙${actualCommission} отправлена Создателю)` : ''} ${message ? `("${message}")` : ''}`
      : `🪙 ${sender.username} перевёл(а) 🪙 ${netReceived} монет пользователю ${recipient.username}! ${actualCommission > 0 ? `(Комиссия 10%: 🪙${actualCommission} отправлена Создателю)` : ''} ${message ? `("${message}")` : ''}`;

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
    if (io) {
      if (chatId && createdMessage) {
        const populatedMsg = await Message.findById(createdMessage._id).populate('senderId', 'username avatarUrl avatarFrame nameColor status role');
        io.to(chatId).emit('message_received', populatedMsg);
      }
      io.emit('coins_updated', { userId: recipient._id, newCoins: recipient.coins });
      io.emit('coins_updated', { userId: sender._id, newCoins: sender.coins });
      if (adminUser) {
        io.emit('coins_updated', { userId: adminUser._id, newCoins: adminUser.coins });
      }
    }

    logger.info(`Gift/Coins sent from ${sender.username} to ${recipient.username}: ${totalCost} coins (Commission to admin: ${actualCommission})`);
    res.status(200).json({ message: 'Подарок успешно отправлен!', senderCoins: sender.coins, commission: actualCommission });
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
