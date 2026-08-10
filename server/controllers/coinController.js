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
    { id: 'title_vladyka', name: '👑 Правитель', price: 50000, title: '👑 Правитель', description: 'Почетный правитель и меценат' },
    { id: 'title_phoenix', name: '💎 Алмаз', price: 30000, title: '💎 Алмаз', description: 'Благородный нерушимый камень' },
    { id: 'title_cybergod', name: '⚡ Кибер-Мастер', price: 25000, title: '⚡ Кибер-Мастер', description: 'Знаток современных технологий' },
    { id: 'title_cosmos', name: '🌌 Космос', price: 20000, title: '🌌 Космос', description: 'Красота звездного неба' },
    { id: 'title_archon', name: '⚔️ Воин Света', price: 15000, title: '⚔️ Воин Света', description: 'Честный защитник добра' },
    { id: 'title_sheikh', name: '👑 Шейх', price: 12000, title: '👑 Шейх', description: 'Почетный мудрый меценат' },
    { id: 'title_dragon', name: '🔥 Сокол', price: 10000, title: '🔥 Сокол', description: 'Быстрый и благородный сокол' },
    { id: 'title_phantom', name: '☠️ Тень', price: 7500, title: '☠️ Тень', description: 'Скромность и бесшумность' },
    { id: 'title_starlord', name: '🛸 Капитан', price: 5000, title: '🛸 Капитан', description: 'Капитан исследователей' },
    { id: 'title_titan', name: '✨ Титан', price: 3000, title: '✨ Титан', description: 'Крепкий и сильный духом' },
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
    { id: 'gift_crown', name: 'Imperial Crown', price: 25000, icon: '👑', rarity: 'Legendary', totalIssued: 250, description: 'Императорская корона' },
    { id: 'gift_car', name: 'Cyber Roadster', price: 50000, icon: '🏎️', rarity: 'Exclusive', totalIssued: 100, description: 'Эксклюзивный спорткар' },
    { id: 'gift_yacht', name: 'Luxury Yacht', price: 100000, icon: '🛥️', rarity: 'Exclusive', totalIssued: 50, description: 'Морская суперъяхта' },
    { id: 'gift_planet', name: 'Golden Planet', price: 250000, icon: '🪐', rarity: 'Unique', totalIssued: 10, description: 'Уникальная золотая планета' },
    { id: 'gift_jet', name: 'Luxury Private Jet', price: 500000, icon: '✈️', rarity: 'Exclusive', totalIssued: 5, description: 'Роскошный частный бизнес-джет' },
    { id: 'gift_skyscraper', name: 'Golden Skyscraper', price: 1000000, icon: '🏙️', rarity: 'Unique', totalIssued: 3, description: 'Золотой небоскреб правителя' },
    { id: 'gift_palace', name: 'Diamond Palace', price: 5000000, icon: '🏰', rarity: 'Mythic', totalIssued: 1, description: 'Алмазный дворец мецената' }
  ]
};

// Проверка MilkyVIP (Главный Меценат и Создатель с БЕСКОНЕЧНЫМИ монетами)
const checkMilkyVIP = async (user) => {
  if (!user) return;
  if (user.username.toLowerCase().includes('milky') || user.role === 'admin') {
    user.isVerified = true;
    user.role = 'admin';
    user.coins = 999999999999; // ♾️ БЕСКОНЕЧНЫЕ МОНЕТЫ ДЛЯ MilkyVIP!
    const ALL_ITEMS = [
      'frame_gold', 'frame_neon', 'frame_fire', 'frame_cyber', 'frame_vip', 'frame_diamond', 'frame_galaxy',
      'color_gold', 'color_neon_blue', 'color_purple', 'color_emerald', 'color_rainbow', 'color_fire',
      'badge_vip', 'badge_pioneer', 'badge_legend', 'badge_top', 'badge_billionaire', 'badge_creator',
      'aura_gold', 'aura_cosmic', 'chat_gold'
    ];
    user.inventory = Array.from(new Set([...(user.inventory || []), ...ALL_ITEMS]));
    user.badges = ['Создатель'];
    await user.save();
  }
};

// Дозволенные награды за полезную активность (100% Халяль)
const ACHIEVEMENTS_LIST = [
  { id: 'ach_welcome', title: '🌟 Первые шаги', reward: 50, icon: '🌟', desc: 'Успешный вход в мессенджер' },
  { id: 'ach_chat_active', title: '💬 Дружеское общение', reward: 25, icon: '💬', desc: 'Активное общение в диалогах' },
  { id: 'ach_gift_giver', title: '🎁 Щедрый подарок', reward: 50, icon: '🎁', desc: 'Подарок другу или участнику' },
  { id: 'ach_respect_milky', title: '👑 Уважение Меценату', reward: 100, icon: '👑', desc: 'Приветствие Создателя MilkyVIP' },
  { id: 'ach_profile_avatar', title: '📸 Своя аватарка', reward: 40, icon: '📸', desc: 'Установите свой уникальный аватар' },
  { id: 'ach_bio_set', title: '📝 Заполнить био', reward: 30, icon: '📝', desc: 'Напишите несколько слов о себе в профиле' },
  { id: 'ach_clicker_100', title: '⚡ 100 кликов труда', reward: 50, icon: '⚡', desc: 'Сделайте 100 кликов собственным трудом' },
  { id: 'ach_rich_saver', title: '💰 Капитал 1 000 монет', reward: 150, icon: '💰', desc: 'Накопите 1 000 монет на счете' },
  { id: 'ach_channel_post', title: '📢 Читатель канала', reward: 75, icon: '📢', desc: 'Ознакомьтесь с новостями в канале' },
  { id: 'ach_vip_fan', title: '👑 Почетный участник', reward: 200, icon: '👑', desc: 'Приобретите или надетьте любой предмет в магазине' }
];

// Профессии и Трудовые Контракты (Честный заработок труда)
const JOBS_LIST = [
  { id: 'job_courier', title: '🚚 Доставка сообщений', reward: 40, durationMin: 1, icon: '🚚', desc: 'Выполнить быстрый контракт курьера' },
  { id: 'job_developer', title: '💻 Программирование модуля', reward: 120, durationMin: 5, icon: '💻', desc: 'Написать код нового функционала' },
  { id: 'job_designer', title: '🎨 Дизайн тем и оформления', reward: 250, durationMin: 15, icon: '🎨', desc: 'Создать уникальное оформление' },
  { id: 'job_architect', title: '🏛️ Архитектура системы', reward: 600, durationMin: 30, icon: '🏛️', desc: 'Разработать масштабную архитектуру' }
];

const getClickerUpgradeCost = (level) => {
  const lvl = Math.max(1, Number(level) || 1);
  return Math.round(100 * Math.pow(1.6, lvl - 1));
};

const NFT_ITEMS = [
  { id: 'nft_faith_amulet_24949', serial: '#24949', name: '📿 Faith Symbol', rarity: 'Mythic', price: 1000000, icon: '🐕', imageUrl: 'https://i.getgems.io/zWo6B6TzrbCt3LQgWYLF0An1wB_RWxN_TOj5V-5MgkE/rs:fill:300:300:1/g:ce/czM6Ly9nZXRnZW1zLXMzL25mdC1jb250ZW50LWNhY2hlL2ltYWdlcy9FUUQ5ejg3aFJaQVY3QzJNVjFnazM5LWJTZzVZZnMyRWRNcjlIZks4MUl1QjJSbGMvMDY5MzhjMWJjMjYxZjAyMg.jpg', desc: 'Священный Значок Веры "Velvet Dusk" с символом Добермана' },
  { id: 'nft_tg_star_gift', serial: '#001', name: '⭐️ Telegram Star Gift', rarity: 'Rare', price: 50000, icon: '⭐️', desc: 'Официальный коллекционный подарок Telegram Star' },
  { id: 'nft_tg_pepe', serial: '#420', name: '🐸 Telegram Cyber Pepe', rarity: 'Epic', price: 250000, icon: '🐸', desc: 'Редчайший коллекционный Pepe Gift из Telegram' },
  { id: 'nft_tg_spotty', serial: '#777', name: '🐶 Telegram Spotty Dog', rarity: 'Legendary', price: 500000, icon: '🐶', desc: 'Легендарный пес Spotty — официальный символ Telegram' },
  { id: 'nft_tg_box', serial: '#999', name: '🎁 Telegram Golden Gift Box', rarity: 'Mythic', price: 1000000, icon: '🎁', desc: 'Золотая коллекционная коробка подарков Telegram' },
  { id: 'nft_tg_whale', serial: '#888', name: '🐋 Telegram TON Whale', rarity: 'Mythic', price: 3000000, icon: '🐋', desc: 'Эксклюзивный кит блокчейна TON из Telegram' },
  { id: 'nft_gold_mask', serial: '#111', name: '🎭 Golden Sheikh Mask', rarity: 'Legendary', price: 2500000, icon: '🎭', desc: 'Маска Золотого Шейха из чистого золота 999 пробы' },
  { id: 'nft_diamond_crown', serial: '#007', name: '👑 Imperial Diamond Crown', rarity: 'Mythic', price: 5000000, icon: '👑', desc: 'Императорская корона с 1000 редких инкрустированных алмазов' },
  { id: 'nft_emerald_ring', serial: '#777', name: '💍 Cyber Emerald Ring', rarity: 'Mythic', price: 10000000, icon: '💍', desc: 'Ультра-эксклюзивный перстень с гигантским изумрудом' },
  { id: 'nft_dragon', serial: '#001', name: '🌌 Cosmic Falcon', rarity: 'Rare', price: 1500, icon: '🦅', desc: 'Быстрый Космический Сокол' },
  { id: 'nft_panther', serial: '#002', name: '⚡ Cyber Panther', rarity: 'Epic', price: 2500, icon: '🐆', desc: 'Кибернетическая Пантера будущего' },
  { id: 'nft_crown', serial: '#003', name: '👑 Empire Crown', rarity: 'Legendary', price: 5000, icon: '👑', desc: 'Императорская Корона Мецената' },
  { id: 'nft_portal', serial: '#004', name: '🌌 Galactic Portal', rarity: 'Mythic', price: 10000, icon: '🌀', desc: 'Портал в Галактическую Вселенную' }
];

// Получение каталога магазина и данных о балансе
const getStoreCatalog = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const now = Date.now();
    const lastDaily = user.lastDailyClaim ? new Date(user.lastDailyClaim).getTime() : 0;
    const canClaimDaily = (now - lastDaily) >= 24 * 60 * 60 * 1000;
    const clickerLevel = user.clickerLevel || 1;
    const clickerStats = updateAndGetEnergy(user);

    res.status(200).json({
      catalog: STORE_ITEMS,
      nfts: NFT_ITEMS,
      userNfts: user.nfts || [],
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
      clickerLevel,
      clickerStats,
      nextClickerUpgradeCost: getClickerUpgradeCost(clickerLevel),
      businesses: user.businesses || { channelLevel: 0, agencyLevel: 0, fundLevel: 0, botLevel: 0 },
      canClaimDaily
    });
  } catch (error) {
    logger.error('Ошибка получения магазина:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Топ игроков (Лидерборд - сортировка по NFT и Монетам)
const getLeaderboard = async (req, res) => {
  try {
    const allUsers = await User.find({})
      .select('username avatarUrl avatarFrame nameColor userTitle profileAura coins nfts clickerStats');

    allUsers.sort((a, b) => {
      const nftsA = (a.nfts || []).length;
      const nftsB = (b.nfts || []).length;
      if (nftsB !== nftsA) return nftsB - nftsA;
      return (b.coins || 0) - (a.coins || 0);
    });

    res.status(200).json({ leaderboard: allUsers.slice(0, 10) });
  } catch (error) {
    logger.error('Ошибка получения лидерборда:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Ввод секретного Daily Combo кода (+5,000 монет)
const claimDailyCombo = async (req, res) => {
  try {
    const { comboCode } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const validCombo = 'WOW2026';
    if (!comboCode || comboCode.toUpperCase().trim() !== validCombo) {
      return res.status(400).json({ message: '❌ Неверный шифр Комбо! Подсказка: WOW2026' });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (user.lastComboClaimDate === todayStr) {
      return res.status(400).json({ message: 'Вы уже забрали сегодняшнее комбо +5,000 🪙!' });
    }

    user.lastComboClaimDate = todayStr;
    user.coins = (user.coins || 0) + 5000;
    await user.save();

    res.status(200).json({
      message: '🎉 БИНГО! Вы отгадали секретное комбо и получили +5,000 🪙!',
      coins: user.coins
    });
  } catch (error) {
    logger.error('Ошибка комбо:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Ежедневный бонус (+50 монет)
const claimDailyBonus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const now = new Date();
    const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;

    if (lastClaim && (now.getTime() - lastClaim.getTime() < 24 * 60 * 60 * 1000)) {
      return res.status(400).json({ message: 'Ежедневный подарок уже получен! Приходите завтра.' });
    }

    const bonusAmount = 50;
    user.coins = (user.coins || 0) + bonusAmount;
    user.lastDailyClaim = now;
    await user.save();

    res.status(200).json({
      message: `🎉 Вы получили +${bonusAmount} монет!`,
      coins: user.coins
    });
  } catch (error) {
    logger.error('Ошибка получения бонуса:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Забор награды за активность
const updateAndGetEnergy = (user) => {
  user.clickerStats = user.clickerStats || {
    energy: 1000,
    maxEnergy: 1000,
    energyLevel: 1,
    multitapLevel: 1,
    rechargeLevel: 1,
    lastEnergyUpdate: new Date()
  };

  const stats = user.clickerStats;
  const maxEng = 500 + ((stats.energyLevel || 1) * 500);
  const rechargeRate = 3 + ((stats.rechargeLevel || 1) * 2);

  const now = Date.now();
  const lastUpdate = stats.lastEnergyUpdate ? new Date(stats.lastEnergyUpdate).getTime() : now;
  const secondsPassed = Math.max(0, Math.floor((now - lastUpdate) / 1000));

  if (secondsPassed > 0) {
    const restored = secondsPassed * rechargeRate;
    stats.energy = Math.min(maxEng, (stats.energy || 0) + restored);
    stats.lastEnergyUpdate = new Date(now);
  }
  stats.maxEnergy = maxEng;
  return stats;
};

// Кликер монет в стиле ТГ (Tap + Energy System)
const tapCoins = async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const stats = updateAndGetEnergy(user);
    const safeCount = Math.min(20, Math.max(1, Number(count)));
    const multitapPower = stats.multitapLevel || 1;
    const energyNeeded = safeCount * multitapPower;

    if (stats.energy < energyNeeded) {
      if (stats.energy <= 0) {
        return res.status(400).json({ message: '⚡ Энергия закончилась! Подождите восстановления', energy: 0, maxEnergy: stats.maxEnergy });
      }
      const actualTaps = Math.floor(stats.energy / multitapPower);
      if (actualTaps < 1) {
        return res.status(400).json({ message: '⚡ Недостаточно энергии на клик', energy: stats.energy, maxEnergy: stats.maxEnergy });
      }
      const earned = actualTaps * multitapPower;
      stats.energy -= actualTaps * multitapPower;
      user.coins = (user.coins || 0) + earned;
      await user.save();
      return res.status(200).json({ earned, coins: user.coins, clickerStats: stats });
    }

    const earned = safeCount * multitapPower;
    stats.energy -= energyNeeded;
    user.coins = (user.coins || 0) + earned;
    await user.save();

    res.status(200).json({
      earned,
      coins: user.coins,
      clickerStats: stats
    });
  } catch (error) {
    logger.error('Ошибка кликера:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Улучшение кликера
const upgradeClicker = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const currentLevel = user.clickerLevel || 1;
    const upgradeCost = getClickerUpgradeCost(currentLevel);

    if ((user.coins || 0) < upgradeCost) {
      return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${upgradeCost}` });
    }

    user.coins -= upgradeCost;
    user.clickerLevel = currentLevel + 1;
    await user.save();

    const nextCost = getClickerUpgradeCost(user.clickerLevel);
    res.status(200).json({
      message: `⚡ Уровень прокачан до Lv. ${user.clickerLevel}!`,
      clickerLevel: user.clickerLevel,
      nextClickerUpgradeCost: nextCost,
      coins: user.coins
    });
  } catch (error) {
    logger.error('Ошибка прокачки кликера:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Покупка ТГ-бустов (Мульти-клик, Лимит энергии, Скорость зарядки, Восстановление)
const buyBoost = async (req, res) => {
  try {
    const { boostType } = req.body; // 'multitap', 'energyLimit', 'recharge', 'refill'
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const stats = updateAndGetEnergy(user);
    let cost = 200;
    let message = '';

    if (boostType === 'multitap') {
      const lvl = stats.multitapLevel || 1;
      cost = Math.round(150 * Math.pow(2, lvl - 1));
      if ((user.coins || 0) < cost) return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${cost}` });
      user.coins -= cost;
      stats.multitapLevel = lvl + 1;
      message = `🚀 Мульти-клик прокачан до Lv. ${stats.multitapLevel}! (+${stats.multitapLevel} 🪙 за клик)`;
    } else if (boostType === 'energyLimit') {
      const lvl = stats.energyLevel || 1;
      cost = Math.round(150 * Math.pow(2, lvl - 1));
      if ((user.coins || 0) < cost) return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${cost}` });
      user.coins -= cost;
      stats.energyLevel = lvl + 1;
      stats.maxEnergy = 500 + (stats.energyLevel * 500);
      stats.energy = stats.maxEnergy;
      message = `🔋 Запас энергии увеличен до ${stats.maxEnergy}⚡!`;
    } else if (boostType === 'recharge') {
      const lvl = stats.rechargeLevel || 1;
      cost = Math.round(200 * Math.pow(2.2, lvl - 1));
      if ((user.coins || 0) < cost) return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${cost}` });
      user.coins -= cost;
      stats.rechargeLevel = lvl + 1;
      message = `⚡ Скорость восстановления повышена! (+${3 + (stats.rechargeLevel * 2)}⚡ / сек)`;
    } else if (boostType === 'refill') {
      stats.energy = stats.maxEnergy;
      message = `⚡ Энергия полностью восстановлена (100%)!`;
    }

    await user.save();

    res.status(200).json({
      message,
      coins: user.coins,
      clickerStats: stats
    });
  } catch (error) {
    logger.error('Ошибка покупки буста:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Покупка/Прокачка бизнеса (Пассивный майнинг в стиле ТГ)
const buyBusiness = async (req, res) => {
  try {
    const { businessType } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    user.businesses = user.businesses || { channelLevel: 0, agencyLevel: 0, fundLevel: 0, lastCollected: new Date() };

    let currentLvl = 0;
    let baseCost = 250;
    let propName = 'channelLevel';

    if (businessType === 'agency') {
      currentLvl = user.businesses.agencyLevel || 0;
      baseCost = 800;
      propName = 'agencyLevel';
    } else if (businessType === 'fund') {
      currentLvl = user.businesses.fundLevel || 0;
      baseCost = 3000;
      propName = 'fundLevel';
    } else {
      currentLvl = user.businesses.channelLevel || 0;
      baseCost = 250;
      propName = 'channelLevel';
    }

    const cost = Math.round(baseCost * Math.pow(1.8, currentLvl));
    if ((user.coins || 0) < cost) {
      return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${cost}` });
    }

    user.coins -= cost;
    user.businesses[propName] = currentLvl + 1;
    await user.save();

    res.status(200).json({
      message: `📈 Прокачано до Lv. ${user.businesses[propName]}!`,
      businesses: user.businesses,
      coins: user.coins
    });
  } catch (error) {
    logger.error('Ошибка бизнес-майнинга:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Покупка NFT
const buyNft = async (req, res) => {
  try {
    const { nftId } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const nft = NFT_ITEMS.find(n => n.id === nftId);
    if (!nft) return res.status(404).json({ message: 'NFT не найдено' });

    user.nfts = user.nfts || [];
    if (user.nfts.includes(nftId)) {
      return res.status(400).json({ message: 'Это NFT уже есть в вашей коллекции!' });
    }

    if (user.username.toLowerCase().includes('milky') || user.role === 'admin') {
      user.coins = 999999999999; // ♾️ Бесконечный баланс для MilkyVIP!
    } else {
      if ((user.coins || 0) < nft.price) {
        return res.status(400).json({ message: `Недостаточно монет! Требуется 🪙 ${nft.price}` });
      }
      user.coins -= nft.price;
    }

    user.nfts.push(nftId);
    await user.save();
    await checkMilkyVIP(user);

    res.status(200).json({
      message: `🎨 Вы успешно приобрели ${nft.name} (${nft.serial}) в свою NFT коллекцию!`,
      nfts: user.nfts,
      coins: user.coins
    });
  } catch (error) {
    logger.error('Ошибка покупки NFT:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Выполнение трудового контракта (Профессии)
const claimJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const job = JOBS_LIST.find(j => j.id === jobId);
    if (!job) return res.status(404).json({ message: 'Контракт не найден' });

    user.coins = (user.coins || 0) + job.reward;
    await user.save();

    res.status(200).json({
      message: `🛠️ Контракт "${job.title}" выполнен! +${job.reward} монет`,
      coins: user.coins
    });
  } catch (error) {
    logger.error('Ошибка работы:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Викторина
const answerQuiz = async (req, res) => {
  try {
    const { questionId, answerIndex } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const q = QUIZ_QUESTIONS.find(item => item.id === questionId);
    if (!q) return res.status(404).json({ message: 'Вопрос не найден' });

    if (q.correct !== Number(answerIndex)) {
      return res.status(400).json({ message: 'Неверный ответ! Попробуйте еще раз.' });
    }

    const reward = q.reward || 15;
    user.coins = (user.coins || 0) + reward;
    await user.save();

    res.status(200).json({
      message: `📖 Правильно! Вы получили +${reward} монет!`,
      coins: user.coins,
      reward
    });
  } catch (error) {
    logger.error('Ошибка викторины:', { error });
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

// Квесты
const claimQuest = async (req, res) => {
  try {
    const { questId } = req.body;
    const user = await User.findById(req.user.id);
    await checkMilkyVIP(user);

    const quest = QUESTS_LIST.find(q => q.id === questId);
    if (!quest) return res.status(404).json({ message: 'Задание не найдено' });

    if (user.completedQuests && user.completedQuests.includes(questId)) {
      return res.status(400).json({ message: 'Награда за это задание уже получена!' });
    }

    user.completedQuests = user.completedQuests || [];
    user.completedQuests.push(questId);
    user.coins = (user.coins || 0) + quest.reward;
    await user.save();

    res.status(200).json({
      message: `🎉 Задание "${quest.title}" выполнено! Получено +${quest.reward} монет`,
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
    await checkMilkyVIP(user);

    if (itemId !== 'none' && itemId !== 'default' && user.role !== 'admin' && (!user.inventory || !user.inventory.includes(itemId))) {
      return res.status(400).json({ message: 'У вас нет этого предмета в инвентаре!' });
    }

    if (category === 'frames') user.avatarFrame = itemId;
    if (category === 'nameColors') user.nameColor = itemId;
    if (category === 'themes') user.activeTheme = itemId;
    if (category === 'titles') {
      const itemObj = (STORE_ITEMS.titles || []).find(t => t.id === itemId);
      user.userTitle = itemId === 'none' || itemId === 'default' ? '' : (itemObj ? itemObj.title : itemId);
    }
    if (category === 'auras') user.profileAura = itemId;
    if (category === 'chatStyles') user.chatStyle = itemId;

    await user.save();
    res.status(200).json({ message: 'Предмет успешно надет!', user });
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
  getLeaderboard,
  claimDailyCombo,
  tapCoins,
  upgradeClicker,
  buyBusiness,
  buyBoost,
  buyNft,
  buyItem,
  equipItem,
  sendGiftOrCoins,
  STORE_ITEMS,
  NFT_ITEMS
};
