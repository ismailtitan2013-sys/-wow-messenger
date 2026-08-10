import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import { useWebRTC } from '../hooks/useWebRTC';
import AudioPlayer from '../components/AudioPlayer';
import { 
  Settings, Users, LogOut, Sun, Moon, 
  Search, Phone, Video, Paperclip, Smile, 
  Send, Edit2, Trash2, ArrowLeft, Check, CheckCheck, BadgeCheck,
  FileText, Download, MessageSquare, X, Mic, Trash, PhoneOff,
  Plus, Sparkles, Eye, Image, Palette, ChevronLeft, ChevronRight, Upload,
  ShoppingBag, Gift, Coins, Award, Crown, User, AtSign, Reply, CornerUpLeft, Zap
} from 'lucide-react';
import { playMessageSound, startRingtone, stopRingtone } from '../utils/sound';
import toast from 'react-hot-toast';
import { requestFCMToken, onForegroundMessage } from '../firebase';
import GiftEffectOverlay from '../components/GiftEffectOverlay';

// Top-level Helper Components to prevent React unmount/remount crashes
const UserAvatar = ({ usr, size = 'default' }) => {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = usr?.avatarUrl;
  const frameClass = usr?.avatarFrame && usr?.avatarFrame !== 'none' ? (usr.avatarFrame.startsWith('frame-') ? usr.avatarFrame : `frame-${usr.avatarFrame}`) : '';
  const auraClass = usr?.profileAura && usr?.profileAura !== 'none' ? (usr.profileAura.startsWith('aura-') ? usr.profileAura : `aura-${usr.profileAura}`) : '';

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  };

  const initial = usr?.username ? usr.username.charAt(0).toUpperCase() : '?';

  return (
    <div className={`avatar-wrapper ${size} ${frameClass} ${auraClass}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'all 0.3s ease' }}>
      {avatarUrl && !imgError ? (
        <img
          src={getFullUrl(avatarUrl)}
          alt=""
          className={`avatar-img ${size}`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`avatar ${size}`}>
          {initial}
        </div>
      )}
    </div>
  );
};

const renderUsernameWithBadge = (usrOrName, isVerified, nameColor, badges, userTitle) => {
  const isObj = typeof usrOrName === 'object' && usrOrName !== null;
  const username = isObj ? usrOrName.username : usrOrName;
  const verified = isVerified !== undefined ? isVerified : (isObj ? usrOrName.isVerified : false);
  const colorClass = nameColor || (isObj ? usrOrName.nameColor : '');
  const title = userTitle || (isObj ? usrOrName.userTitle : '');

  let nameStyleClass = '';
  if (colorClass && colorClass !== 'default' && colorClass !== 'none') {
    nameStyleClass = colorClass.startsWith('name-color-') ? colorClass : `name-color-${colorClass}`;
  } else if (username === 'MilkyVIP') {
    nameStyleClass = 'milky-vip-name';
  }

  return (
    <span className="user-name-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', border: 'none', outline: 'none' }}>
      <span className={nameStyleClass} style={{ fontWeight: 800, border: 'none', outline: 'none' }}>
        {username || 'Пользователь'}
      </span>
      {title && <span className="user-title-tag">{title}</span>}
      {(verified || username === 'MilkyVIP') && <BadgeCheck size={16} color="#3b82f6" title="Оригинал" />}
    </span>
  );
};

const Chat = () => {
  const { user, token, logout, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const socketRef = useRef();
  
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const currentChatRef = useRef(currentChat);
  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  
  // Audio Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  
  // States for Phase 3
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingMessage, setReplyingMessage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(null);
  
  // Group creation states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
  const [isChannelCreation, setIsChannelCreation] = useState(false);

  const handleToggleGroupUser = (userId) => {
    setSelectedGroupUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const res = await axios.post('/api/chats/group', {
        name: groupName,
        users: selectedGroupUsers,
        isChannel: isChannelCreation
      });
      setChats(prev => [res.data, ...prev]);
      setCurrentChat(res.data);
      setShowGroupModal(false);
      setGroupName('');
      setSelectedGroupUsers([]);
      setIsChannelCreation(false);
      toast.success(isChannelCreation ? '📢 Канал успешно создан!' : '👥 Группа успешно создана!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при создании');
    }
  };

  // Stories States
  const [storiesFeed, setStoriesFeed] = useState([]);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [newStoryText, setNewStoryText] = useState('');
  const [newStoryMediaUrl, setNewStoryMediaUrl] = useState('');
  const [newStoryType, setNewStoryType] = useState('text');
  const [newStoryBg, setNewStoryBg] = useState('linear-gradient(135deg, #6366f1 0%, #a855f7 100%)');
  const [activeStoryViewer, setActiveStoryViewer] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyReplyText, setStoryReplyText] = useState('');
  const [uploadingStoryFile, setUploadingStoryFile] = useState(false);

  // Phase 5 States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [profileData, setProfileData] = useState({ 
    username: user?.username || '', 
    bio: user?.bio || '', 
    avatarUrl: user?.avatarUrl || '',
    settings: user?.settings || { 
      showOnlineStatus: true, 
      showLastSeen: true, 
      allowPushNotifications: true, 
      readReceipts: true, 
      accentColor: '#4f46e5' 
    }
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Store & Coins States
  const DEFAULT_CATALOG = {
    frames: [
      { id: 'frame_gold', name: 'Золотая Аура', price: 1500, icon: '✨' },
      { id: 'frame_neon', name: 'Неоновый Всплеск', price: 2500, icon: '⚡' },
      { id: 'frame_fire', name: 'Пламенный Огонь', price: 4000, icon: '🔥' },
      { id: 'frame_cyber', name: 'Киберпанк', price: 6000, icon: '🤖' },
      { id: 'frame_vip', name: 'Корона Мецената', price: 10000, icon: '👑' },
      { id: 'frame_diamond', name: 'Изумрудный Свет', price: 25000, icon: '💎' },
      { id: 'frame_galaxy', name: 'Звездный Свет', price: 50000, icon: '🌌' }
    ],
    nameColors: [
      { id: 'color_gold', name: 'Золотой', price: 1000 },
      { id: 'color_neon_blue', name: 'Неоновый Синий', price: 1500 },
      { id: 'color_purple', name: 'Пурпурный', price: 2000 },
      { id: 'color_emerald', name: 'Изумрудный', price: 3000 },
      { id: 'color_rainbow', name: 'Радужный', price: 7500 },
      { id: 'color_fire', name: 'Огненный', price: 10000 }
    ],
    badges: [
      { id: 'badge_pioneer', name: 'Пионер', price: 2000, badge: 'Пионер' },
      { id: 'badge_vip', name: 'VIP Меценат', price: 2500, badge: 'VIP' },
      { id: 'badge_top', name: 'Почетный Участник', price: 5000, badge: 'Топ' },
      { id: 'badge_legend', name: 'Легенда', price: 15000, badge: 'Легенда' },
      { id: 'badge_billionaire', name: 'Щедрый Меценат', price: 50000, badge: 'Меценат' }
    ],
    titles: [
      { id: 'title_vladyka', name: '👑 Владыка', price: 50000, title: '👑 Владыка' },
      { id: 'title_phoenix', name: '💎 Феникс', price: 30000, title: '💎 Феникс' },
      { id: 'title_cybergod', name: '⚡ Кибер-Бог', price: 25000, title: '⚡ Кибер-Бог' },
      { id: 'title_cosmos', name: '🌌 Космос', price: 20000, title: '🌌 Космос' },
      { id: 'title_archon', name: '⚔️ Архонт', price: 15000, title: '⚔️ Архонт' },
      { id: 'title_sheikh', name: '👑 Шейх', price: 12000, title: '👑 Шейх' },
      { id: 'title_dragon', name: '🔥 Дракон', price: 10000, title: '🔥 Дракон' },
      { id: 'title_phantom', name: '☠️ Призрак', price: 7500, title: '☠️ Призрак' },
      { id: 'title_starlord', name: '🛸 Старлорд', price: 5000, title: '🛸 Старлорд' },
      { id: 'title_titan', name: '✨ Титан', price: 3000, title: '✨ Титан' }
    ],
    auras: [
      { id: 'aura_gold', name: '✨ Золотая Аура', price: 3000 },
      { id: 'aura_neon', name: '⚡ Неоновый Пульс', price: 5000 },
      { id: 'aura_fire', name: '🔥 Огненный Всплеск', price: 10000 },
      { id: 'aura_cosmic', name: '🌌 Космический Взрыв', price: 30000 }
    ],
    chatStyles: [
      { id: 'chat_gold', name: '👑 Золотые Сообщения', price: 5000 },
      { id: 'chat_neon', name: '⚡ Неоновый Чат', price: 7500 },
      { id: 'chat_emerald', name: '🌿 Изумрудные Сообщения', price: 3500 }
    ],
    gifts: []
  };

  const [showStoreModal, setShowStoreModal] = useState(false);
  const [activeStoreTab, setActiveStoreTab] = useState('clicker');
  const [activeGiftEffect, setActiveGiftEffect] = useState(null);
  const [storeData, setStoreData] = useState({
    catalog: DEFAULT_CATALOG,
    quests: [],
    userCoins: user?.coins || 100,
    userInventory: user?.inventory || [],
    equippedFrame: user?.avatarFrame || 'none',
    equippedColor: user?.nameColor || 'default',
    equippedTheme: user?.activeTheme || 'default',
    equippedTitle: user?.userTitle || '',
    equippedAura: user?.profileAura || 'none',
    equippedChatStyle: user?.chatStyle || 'default',
    equippedBadges: user?.badges || [],
    giftsReceived: user?.giftsReceived || [],
    completedQuests: user?.completedQuests || [],
    clickerLevel: user?.clickerLevel || 1,
    canClaimDaily: true,
    canSpinWheel: true
  });
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState('gift_dates');
  const [coinsToSend, setCoinsToSend] = useState(50);
  const [giftMsg, setGiftMsg] = useState('');
  const [giftRecipient, setGiftRecipient] = useState(null);

  // Clicker & Mini-Games States
  const [tapFloats, setTapFloats] = useState([]);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const fetchStoreAndOpen = async () => {
    try {
      const res = await axios.get('/api/coins/store', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.catalog) {
        setStoreData(prev => ({
          ...prev,
          ...res.data,
          catalog: { ...DEFAULT_CATALOG, ...(res.data.catalog || {}) }
        }));
      }
    } catch (err) {
      console.warn('Store API fallback:', err);
    } finally {
      setShowStoreModal(true);
    }
  };

  const handleClaimDaily = async () => {
    const bonusAmount = 5;
    const nextCoins = (user?.coins || 0) + bonusAmount;

    setUser(prev => {
      if (!prev) return prev;
      const u = { ...prev, coins: nextCoins };
      localStorage.setItem('wow_user', JSON.stringify(u));
      return u;
    });
    setStoreData(prev => ({ ...prev, userCoins: nextCoins, canClaimDaily: false }));
    toast.success(`🌙 Вы получили подарок +${bonusAmount} монет!`);

    try {
      const res = await axios.post('/api/coins/claim-daily', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && typeof res.data === 'object' && typeof res.data.coins === 'number') {
        setUser(prev => prev ? ({ ...prev, coins: res.data.coins }) : prev);
        setStoreData(prev => ({ ...prev, userCoins: res.data.coins }));
      }
    } catch (err) {
      // Handled locally
    }
  };

  const handleTapCoin = async (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 20;
    const y = e.clientY - rect.top - 20;

    const level = storeData?.clickerLevel || 1;
    // 10 тапов = 1 монета на Lv.1
    const coinsPerTap = Math.max(1, Math.round(1 * 0.1 * level));
    const tapVal = `+${coinsPerTap}`;

    const newFloat = { id: Date.now() + Math.random(), x, y, text: tapVal };
    setTapFloats(prev => [...prev.slice(-12), newFloat]);
    setTimeout(() => {
      setTapFloats(prev => prev.filter(f => f.id !== newFloat.id));
    }, 800);

    const nextCoins = (user?.coins || 0) + coinsPerTap;
    setUser(prev => {
      if (!prev) return prev;
      const u = { ...prev, coins: nextCoins };
      localStorage.setItem('wow_user', JSON.stringify(u));
      return u;
    });
    setStoreData(prev => ({ ...prev, userCoins: nextCoins }));

    try {
      const res = await axios.post('/api/coins/tap', { count: 1 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && typeof res.data === 'object' && typeof res.data.coins === 'number') {
        setUser(prev => prev ? ({ ...prev, coins: res.data.coins }) : prev);
        setStoreData(prev => ({ ...prev, userCoins: res.data.coins }));
      }
    } catch (err) {
      // Handled locally
    }
  };

  const handleUpgradeClicker = async () => {
    const currentLevel = storeData?.clickerLevel || 1;
    const upgradeCost = Math.round(Math.pow(currentLevel, 1.8) * 500);

    if ((user?.coins || 0) < upgradeCost) {
      toast.error(`Недостаточно монет! Требуется 🪙 ${upgradeCost}`);
      return;
    }

    const nextLevel = currentLevel + 1;
    const nextCoins = (user?.coins || 0) - upgradeCost;

    setUser(prev => {
      if (!prev) return prev;
      const u = { ...prev, coins: nextCoins, clickerLevel: nextLevel };
      localStorage.setItem('wow_user', JSON.stringify(u));
      return u;
    });
    setStoreData(prev => ({ ...prev, clickerLevel: nextLevel, userCoins: nextCoins }));
    toast.success(`⚡ Уровень мастерства повышен до Lv. ${nextLevel}!`);

    try {
      const res = await axios.post('/api/coins/upgrade-clicker', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && typeof res.data === 'object' && res.data.clickerLevel) {
        setStoreData(prev => ({ ...prev, clickerLevel: res.data.clickerLevel, userCoins: res.data.coins }));
      }
    } catch (err) {
      // Handled locally
    }
  };

  const handleAnswerQuiz = async (questionId, answerIndex) => {
    const q = (storeData?.quizQuestions || [
      { id: 1, question: 'Что является традиционным символом уюта и гостеприимства?', options: ['Горячий ароматный кофе', 'Кола', 'Чипсы'], correct: 0, reward: 3 },
      { id: 2, question: 'Какое приветствие означает дружеское пожелание мира?', options: ['Приветствие мира', 'Привет', 'Хеллоу'], correct: 0, reward: 3 },
      { id: 3, question: 'Как называется добровольная поддержка и милостыня ради добра?', options: ['Благотворительность', 'Кредит', 'Процент'], correct: 0, reward: 5 },
      { id: 4, question: 'Честны ли азартные игры и быстрые рискованные ставки?', options: ['Нет, это опасный риск и обман', 'Да, вполне', 'Не знаю'], correct: 0, reward: 10 }
    ]).find(item => item.id === questionId);

    if (!q) return;

    if (q.correct !== Number(answerIndex)) {
      toast.error('Неверный ответ! Попробуйте еще раз.');
      return;
    }

    const reward = q.reward || 3;
    const nextCoins = (user?.coins || 0) + reward;

    setUser(prev => {
      if (!prev) return prev;
      const u = { ...prev, coins: nextCoins };
      localStorage.setItem('wow_user', JSON.stringify(u));
      return u;
    });
    setStoreData(prev => ({ ...prev, userCoins: nextCoins }));
    toast.success(`📖 Правильно! Вы получили +🪙 ${reward} монет за знания!`);

    try {
      await axios.post('/api/coins/quiz', { questionId, answerIndex }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      // Handled locally
    }
  };

  const handleClaimQuest = async (questId) => {
    const quest = (storeData?.quests || [
      { id: 'quest_first_msg', title: '💬 Пожелать мира в чате', reward: 5, icon: '💬', desc: 'Отправьте приветствие в любой чат' },
      { id: 'quest_send_gift', title: '🎁 Сделать подарок другу', reward: 10, icon: '🎁', desc: 'Подарите красивый подарок другу' },
      { id: 'quest_click_100', title: '⚡ Натапать 100 монет честным трудом', reward: 15, icon: '⚡', desc: 'Заработайте 100 монет в кликере труда' },
      { id: 'quest_quiz', title: '📖 Пройти Викторину Знаний', reward: 15, icon: '📖', desc: 'Ответьте правильно на вопросы викторины' },
      { id: 'quest_milky_fan', title: '👑 Поприветствовать Мецената MilkyVIP', reward: 25, icon: '👑', desc: 'Отдайте дань уважения создателю MilkyVIP' },
    ]).find(q => q.id === questId);

    if (!quest) return;

    if (storeData?.completedQuests?.includes(questId)) {
      toast.error('Награда за это задание уже получена!');
      return;
    }

    const nextCoins = (user?.coins || 0) + quest.reward;
    const nextDone = [...(storeData?.completedQuests || []), questId];

    setUser(prev => {
      if (!prev) return prev;
      const u = { ...prev, coins: nextCoins, completedQuests: nextDone };
      localStorage.setItem('wow_user', JSON.stringify(u));
      return u;
    });
    setStoreData(prev => ({ ...prev, userCoins: nextCoins, completedQuests: nextDone }));
    toast.success(`🎉 Задание "${quest.title}" выполнено! +🪙 ${quest.reward}`);

    try {
      await axios.post('/api/coins/claim-quest', { questId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      // Handled locally
    }
  };

  const handleBuyItem = async (itemId, category) => {
    try {
      const res = await axios.post('/api/coins/buy', { itemId, category }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || 'Покупка совершена!');
      if (res.data.user) {
        setUser(prev => {
          const u = { ...prev, ...res.data.user };
          localStorage.setItem('wow_user', JSON.stringify(u));
          return u;
        });
        setStoreData(prev => ({
          ...prev,
          userCoins: res.data.coins,
          userInventory: res.data.inventory,
          equippedFrame: res.data.user.avatarFrame,
          equippedColor: res.data.user.nameColor,
          equippedTheme: res.data.user.activeTheme,
          equippedTitle: res.data.user.userTitle,
          equippedAura: res.data.user.profileAura,
          equippedChatStyle: res.data.user.chatStyle
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка покупки');
    }
  };

  const handleEquipItem = async (itemId, category) => {
    try {
      const res = await axios.post('/api/coins/equip', { itemId, category }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || 'Предмет надет!');
      if (res.data.user) {
        setUser(prev => {
          const u = { ...prev, ...res.data.user };
          localStorage.setItem('wow_user', JSON.stringify(u));
          return u;
        });
        setStoreData(prev => ({
          ...prev,
          equippedFrame: res.data.user.avatarFrame,
          equippedColor: res.data.user.nameColor,
          equippedTheme: res.data.user.activeTheme,
          equippedTitle: res.data.user.userTitle,
          equippedAura: res.data.user.profileAura,
          equippedChatStyle: res.data.user.chatStyle
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка экипировки');
    }
  };

  const handleSendGiftOrCoins = async () => {
    const targetUser = giftRecipient || showUserProfile || getPartner(currentChat);
    if (!targetUser) return;

    const recipientId = targetUser.id || targetUser._id;
    const chatId = currentChat?._id || currentChat?.id;
    const selectedGiftObj = storeData.catalog?.gifts?.find(g => g.id === selectedGiftId);

    try {
      const res = await axios.post('/api/coins/send-gift', {
        recipientId,
        giftId: selectedGiftId,
        coinsAmount: coinsToSend,
        message: giftMsg,
        chatId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(res.data.message);
      setUser(prev => {
        const u = { ...prev, coins: res.data.senderCoins };
        localStorage.setItem('wow_user', JSON.stringify(u));
        return u;
      });

      // Взрывной халяльный эффект подарка на экране!
      if (selectedGiftObj) {
        setActiveGiftEffect({
          icon: selectedGiftObj.icon,
          name: selectedGiftObj.name,
          coins: selectedGiftObj.price,
          message: giftMsg,
          senderName: user?.username
        });
      } else {
        setActiveGiftEffect({
          icon: '🪙',
          name: `Перевод ${coinsToSend} монет`,
          coins: coinsToSend,
          message: giftMsg,
          senderName: user?.username
        });
      }

      setShowGiftModal(false);
      setGiftMsg('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка отправки');
    }
  };
  
  // Dark mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // Responsive
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);

  // WebRTC
  const {
    callState,
    setCallState,
    localVideoRef,
    remoteVideoRef,
    callUser,
    answerCall,
    rejectCall,
    leaveCall,
    cleanupCall,
    toggleAudio,
    toggleVideo,
    peerConnectionRef,
    earlyCandidatesRef
  } = useWebRTC(socketRef, user?.id);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const scrollRef = useRef();
  const emojiPickerRef = useRef();
  const contextMenuRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (profileData.settings?.accentColor) {
      document.documentElement.style.setProperty('--primary-color', profileData.settings.accentColor);
      document.documentElement.style.setProperty('--primary-color-hover', profileData.settings.accentColor);
    }
  }, [profileData.settings?.accentColor]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest('.btn-emoji')) {
        setShowEmojiPicker(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (token) {
      socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: { token }
      });

      socketRef.current.on('receive_message', (message) => {
        const activeChat = currentChatRef.current;
        const msgChatId = String(message.chatId?._id || message.chatId || '');
        const activeChatId = String(activeChat?.id || activeChat?._id || '');
        const msgSenderId = typeof message.senderId === 'object' ? String(message.senderId.id || message.senderId._id) : String(message.senderId);

        if (msgSenderId !== String(user.id)) {
          playMessageSound();
        }

        if (activeChatId && msgChatId === activeChatId) {
          if (msgSenderId !== String(user.id)) {
            socketRef.current.emit('mark_as_read', activeChatId);
          }
          setMessages((prev) => {
            const msgId = String(message.id || message._id || Math.random());
            if (prev.some(m => String(m.id || m._id) === msgId)) {
              return prev;
            }
            return [...prev, message];
          });
        }
        updateChatListWithNewMessage(message);
      });

      socketRef.current.on('message_edited', (editedMsg) => {
        setMessages((prev) => prev.map(m => String(m.id || m._id) === String(editedMsg.id || editedMsg._id) ? editedMsg : m));
        updateChatListWithNewMessage(editedMsg, true);
      });

      socketRef.current.on('message_deleted', (deletedMsg) => {
        setMessages((prev) => prev.map(m => String(m.id || m._id) === String(deletedMsg.id || deletedMsg._id) ? deletedMsg : m));
        updateChatListWithNewMessage(deletedMsg, true);
        if (user?.role === 'admin' || user?.username === 'MilkyVIP') {
          toast('Собеседник удалил сообщение, но оно сохранено для вас!', { icon: '👁️' });
        }
      });

      socketRef.current.on('messages_read', ({ chatId, readBy }) => {
        const activeChat = currentChatRef.current;
        const activeChatId = String(activeChat?.id || activeChat?._id || '');
        if (activeChatId && String(chatId) === activeChatId) {
          setMessages((prev) => prev.map(m => {
            const mSenderId = typeof m.senderId === 'object' ? String(m.senderId.id || m.senderId._id) : String(m.senderId);
            return (mSenderId === String(user.id) && m.status !== 'read') ? { ...m, status: 'read', isRead: true } : m;
          }));
        }
      });

      socketRef.current.on('typing', (data) => {
        const activeChat = currentChatRef.current;
        const activeChatId = String(activeChat?.id || activeChat?._id || '');
        if (activeChatId && String(data.chatId) === activeChatId) {
          setPartnerTyping(data.isTyping);
        }
      });

      socketRef.current.on('call_incoming', ({ signal, from, name, isVideo }) => {
        startRingtone();
        setCallState(prev => ({
          ...prev,
          isReceivingCall: true,
          callerSignal: signal,
          callerId: from,
          callerName: name,
          isVideo,
          callEnded: false
        }));
      });

      socketRef.current.on('call_accepted', async (signal) => {
        stopRingtone();
        setCallState(prev => ({ ...prev, callAccepted: true }));
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          
          for (const c of earlyCandidatesRef.current) {
            try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
          }
          earlyCandidatesRef.current = [];
        }
      });

      socketRef.current.on('ice_candidate', async ({ candidate }) => {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Ошибка добавления ICE кандидата', e);
          }
        } else {
          earlyCandidatesRef.current.push(candidate);
        }
      });

      socketRef.current.on('call_rejected', () => {
        toast.error('Абонент отклонил вызов');
        cleanupCall();
      });

      socketRef.current.on('call_ended', () => {
        cleanupCall();
      });

      socketRef.current.on('message_reaction', ({ messageId, reactions }) => {
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId || msg._id === messageId) {
            return { ...msg, reactions };
          }
          return msg;
        }));
      });
      
      socketRef.current.on('global_announcement', (text) => {
        toast(text, {
          icon: '📢',
          duration: 10000,
          style: {
            borderRadius: '10px',
            background: 'var(--primary-color)',
            color: '#fff',
            fontWeight: 'bold'
          }
        });
      });
      
      setupPushNotifications();
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token, currentChat]);

  useEffect(() => {
    fetchChats();
    fetchStoriesFeed();
  }, []);

  const fetchStoriesFeed = async () => {
    try {
      const res = await axios.get('/api/stories/feed');
      setStoriesFeed(res.data);
    } catch (err) {
      console.error('Ошибка загрузки историй:', err);
    }
  };

  useEffect(() => {
    if (!activeStoryViewer) return;

    const currentStory = activeStoryViewer.stories[activeStoryIndex];
    if (currentStory) {
      axios.post(`/api/stories/${currentStory.id || currentStory._id}/view`).catch(() => {});
    }

    const timer = setTimeout(() => {
      handleNextStory();
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeStoryViewer, activeStoryIndex]);

  const handleAddStory = async () => {
    if (!newStoryText.trim() && !newStoryMediaUrl.trim()) {
      return toast.error('Заполните текст или выберите фото/видео файл');
    }
    const toastId = toast.loading('Публикация истории...');
    try {
      const isVideo = newStoryType === 'video' || newStoryMediaUrl.match(/\.(mp4|webm|mov|avi)$/i);
      await axios.post('/api/stories', {
        text: newStoryText,
        mediaUrl: newStoryMediaUrl,
        mediaType: newStoryMediaUrl ? (isVideo ? 'video' : 'image') : 'text',
        backgroundColor: newStoryBg
      });
      toast.success('История опубликована на 24 часа! ✨', { id: toastId });
      setShowAddStoryModal(false);
      setNewStoryText('');
      setNewStoryMediaUrl('');
      fetchStoriesFeed();
    } catch (err) {
      toast.error('Ошибка публикации истории', { id: toastId });
    }
  };

  const handleStoryFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingStoryFile(true);
    const toastId = toast.loading('Загрузка файла с устройства...');
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const mediaPath = res.data.url;
      const isVideo = res.data.type === 'video' || file.type.startsWith('video/');

      setNewStoryMediaUrl(mediaPath);
      setNewStoryType(isVideo ? 'video' : 'image');
      toast.success(isVideo ? 'Видео успешно загружено!' : 'Фото успешно загружено!', { id: toastId });
    } catch (err) {
      toast.error('Ошибка загрузки файла', { id: toastId });
    } finally {
      setUploadingStoryFile(false);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Удалить эту историю?')) return;
    try {
      await axios.delete(`/api/stories/${storyId}`);
      toast.success('История удалена');
      setActiveStoryViewer(null);
      fetchStoriesFeed();
    } catch (err) {
      toast.error('Ошибка удаления истории');
    }
  };

  const handleNextStory = () => {
    if (!activeStoryViewer) return;
    if (activeStoryIndex < activeStoryViewer.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else {
      const currentGroupIdx = storiesFeed.findIndex(g => String(g.user._id || g.user.id) === String(activeStoryViewer.user._id || activeStoryViewer.user.id));
      if (currentGroupIdx !== -1 && currentGroupIdx < storiesFeed.length - 1) {
        setActiveStoryViewer(storiesFeed[currentGroupIdx + 1]);
        setActiveStoryIndex(0);
      } else {
        setActiveStoryViewer(null);
      }
    }
  };

  const handlePrevStory = () => {
    if (!activeStoryViewer) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    } else {
      const currentGroupIdx = storiesFeed.findIndex(g => String(g.user._id || g.user.id) === String(activeStoryViewer.user._id || activeStoryViewer.user.id));
      if (currentGroupIdx > 0) {
        const prevGroup = storiesFeed[currentGroupIdx - 1];
        setActiveStoryViewer(prevGroup);
        setActiveStoryIndex(prevGroup.stories.length - 1);
      } else {
        setActiveStoryViewer(null);
      }
    }
  };

  const handleSendStoryReply = async () => {
    if (!storyReplyText.trim() || !activeStoryViewer) return;
    try {
      const chatRes = await axios.post('/api/chats', { targetUserId: activeStoryViewer.user._id || activeStoryViewer.user.id });
      const targetChat = chatRes.data;
      
      const currentStory = activeStoryViewer.stories[activeStoryIndex];
      const storySnippet = currentStory.text ? `"${currentStory.text}"` : 'историю';
      const msgText = `Ответ на историю (${storySnippet}): ${storyReplyText}`;
      
      socketRef.current.emit('send_message', {
        chatId: targetChat.id || targetChat._id,
        text: msgText,
        receiverId: activeStoryViewer.user._id || activeStoryViewer.user.id
      });
      
      toast.success('Ответ отправлен!');
      setStoryReplyText('');
    } catch (err) {
      toast.error('Ошибка отправки ответа');
    }
  };

  const fetchChats = async () => {
    try {
      const res = await axios.get('/api/chats');
      setChats(res.data);
    } catch (error) {
      toast.error('Ошибка загрузки чатов');
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (currentChat) {
        try {
          const res = await axios.get(`/api/chats/${currentChat.id}/messages`);
          setMessages(res.data);
          socketRef.current.emit('join_chat', currentChat.id);
          socketRef.current.emit('mark_as_read', currentChat.id);
        } catch (error) {
          console.error('Ошибка загрузки сообщений:', error);
        }
      }
    };
    fetchMessages();
  }, [currentChat]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await axios.get(`/api/users/search?search=${searchQuery}`);
        setSearchResults(res.data);
      } catch (error) {}
    };
    
    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleStartChat = async (targetUserId) => {
    try {
      const res = await axios.post('/api/chats', { targetUserId });
      const chat = res.data;
      if (!chats.find(c => c.id === chat.id)) {
        setChats([chat, ...chats]);
      }
      setCurrentChat(chat);
      setSearchQuery('');
      setSearchResults([]);
      setShowSidebarOnMobile(false);
    } catch (error) {
      console.error('Ошибка при создании чата:', error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    } catch (err) {
      toast.error('Ошибка при загрузке файла');
      return null;
    }
  };

  const handleSendMessage = async (e, audioBlob = null, audioFileName = 'audio_message.webm') => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !selectedFile && !audioBlob) return;

    let attachmentData = null;

    if (audioBlob) {
      const formData = new FormData();
      formData.append('file', audioBlob, audioFileName);
      try {
        const res = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
        });
        attachmentData = res.data;
      } catch (err) {
        toast.error('Ошибка загрузки голосового сообщения');
        return;
      }
    } else if (selectedFile) {
      attachmentData = await uploadFile();
      if (!attachmentData) return;
      setSelectedFile(null);
    }

    if (editingMessage) {
      socketRef.current.emit('edit_message', {
        chatId: currentChat.id,
        messageId: editingMessage.id,
        newText: newMessage
      });
      setEditingMessage(null);
    } else {
      const messageData = {
        chatId: currentChat.id,
        text: newMessage,
        receiverId: currentChat.isGroup ? null : getPartner(currentChat).id,
        attachments: attachmentData ? [attachmentData] : [],
        replyTo: replyingMessage || null
      };
      socketRef.current.emit('send_message', messageData);
      setReplyingMessage(null);
    }
    
    socketRef.current.emit('typing', { chatId: currentChat.id, isTyping: false });
    setNewMessage('');
    setShowEmojiPicker(false);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { chatId: currentChat.id, isTyping: true });
    }
    let lastTypingTime = (new Date()).getTime();
    setTimeout(() => {
      let timeNow = (new Date()).getTime();
      let timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= 2000 && isTyping) {
        socketRef.current.emit('typing', { chatId: currentChat.id, isTyping: false });
        setIsTyping(false);
      }
    }, 2000);
  };

  const onEmojiClick = (emojiObject) => setNewMessage(prev => prev + emojiObject.emoji);

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    if (!msg.deletedForEveryone) {
      setContextMenu({ message: msg, x: e.clientX, y: e.clientY });
    }
  };

  const handleReplyClick = (msg) => {
    const senderName = typeof msg.senderId === 'object' ? msg.senderId.username : (msg.senderId === user.id ? user.username : (getPartner(currentChat)?.username || 'Пользователь'));
    setReplyingMessage({
      id: msg.id || msg._id,
      senderName,
      text: msg.text || msg.content || (msg.attachments?.length ? 'Файл' : 'Сообщение')
    });
    setContextMenu(null);
  };

  const handleEditClick = () => {
    setEditingMessage(contextMenu.message);
    setNewMessage(contextMenu.message.text || contextMenu.message.content || '');
    setContextMenu(null);
  };

  const handleDeleteClick = () => {
    socketRef.current.emit('delete_message', { chatId: currentChat.id, messageId: contextMenu.message.id });
    setContextMenu(null);
  };

  const compressImageToBase64 = (file, maxWidth = 300, maxHeight = 300, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided'));
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (err) => reject(err || new Error('Image load failed'));
        img.src = event.target.result;
      };
      reader.onerror = (err) => reject(err || new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('Загрузка аватара...');
    try {
      let newAvatarUrl = '';
      try {
        newAvatarUrl = await compressImageToBase64(file, 300, 300, 0.85);
      } catch (errCompress) {
        console.warn('Base64 compression failed, falling back to upload endpoint:', errCompress);
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
        });
        newAvatarUrl = res.data.url;
      }

      setProfileData(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
      
      const payload = {
        username: profileData.username || user.username,
        bio: profileData.bio || user.bio || '',
        avatarUrl: newAvatarUrl,
        settings: profileData.settings || user.settings
      };

      const updateRes = await axios.put('/api/users/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(prev => {
        const updatedUser = { ...prev, ...updateRes.data };
        localStorage.setItem('wow_user', JSON.stringify(updatedUser));
        return updatedUser;
      });

      toast.success('Аватар загружен и сохранен!', { id: toastId });
    } catch (err) {
      console.error('Ошибка загрузки аватара:', err);
      toast.error(err.response?.data?.message || 'Ошибка загрузки аватара', { id: toastId });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const res = await axios.put('/api/users/profile', profileData);
      setUser(prev => {
        const updatedUser = { ...prev, ...res.data };
        localStorage.setItem('wow_user', JSON.stringify(updatedUser));
        return updatedUser;
      });
      
      // Обновляем accent-color если он изменился
      if (profileData.settings?.accentColor) {
        document.documentElement.style.setProperty('--primary-color', profileData.settings.accentColor);
        document.documentElement.style.setProperty('--primary-color-hover', profileData.settings.accentColor);
      }
      
      setShowSettingsModal(false);
      toast.success('Настройки сохранены');
    } catch (err) {
      toast.error('Ошибка при обновлении профиля');
    }
  };

  const updateChatListWithNewMessage = (message, isUpdate = false) => {
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(c => c.id === message.chatId);
      if (chatIndex > -1) {
        const chat = prevChats[chatIndex];
        if (isUpdate && chat.lastMessage?.id !== message.id) return prevChats; 
        const updatedChat = { ...chat, lastMessage: message };
        const newChats = [...prevChats];
        newChats.splice(chatIndex, 1);
        newChats.unshift(updatedChat);
        return newChats;
      }
      return prevChats;
    });
  };

  const getPartner = (chat) => {
    if (!chat || chat.isGroup) return null;
    return chat.participants.find(p => p && p.id !== user.id && p._id !== user.id) || chat.participants.find(p => p) || {};
  };

  const getChatName = (chat) => chat.isGroup ? chat.groupName : (getPartner(chat)?.username || 'Удаленный аккаунт');
  const handleLogout = () => { logout(); navigate('/login'); };

  const setupPushNotifications = async () => {
    try {
      const fcmToken = await requestFCMToken();
      if (fcmToken) {
        await axios.post('/api/push/subscribe', { fcmToken });
        
        // Обработка уведомлений на переднем плане
        onForegroundMessage((payload) => {
          toast(payload.notification?.body || 'Новое сообщение', {
            icon: '📩',
            style: { borderRadius: '12px' }
          });
        });
      }
    } catch (err) {
      console.error('Push notification setup failed:', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      toast.error('Нет доступа к микрофону');
    }
  };

  const stopRecordingAndSend = () => {
    if (!mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.onstop = () => {
      const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      handleSendMessage(null, audioBlob, `audio_message.${ext}`);
      audioChunksRef.current = [];
    };
    
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    setIsRecording(false);
    clearInterval(timerRef.current);
    audioChunksRef.current = [];
  };

  const formatRecordingTime = (time) => {
    const min = Math.floor(time / 60);
    const sec = time % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const renderReactions = (reactions) => {
    if (!reactions || reactions.length === 0) return null;
    
    // Group by emoji
    const counts = {};
    reactions.forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    
    return (
      <div className="message-reactions-container" style={{display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap'}}>
        {Object.entries(counts).map(([emoji, count]) => (
          <span key={emoji} style={{background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '2px 6px', fontSize: '0.8rem', cursor: 'default'}}>
            {emoji} {count > 1 && <span style={{fontSize: '0.75rem', opacity: 0.8}}>{count}</span>}
          </span>
        ))}
      </div>
    );
  };

  const renderMessageStatus = (msg) => {
    if (msg.senderId !== user.id) return null;
    if (msg.status === 'read') return <CheckCheck size={14} className="msg-status read" />;
    if (msg.status === 'delivered') return <CheckCheck size={14} className="msg-status delivered" />;
    return <Check size={14} className="msg-status sent" />;
  };

  const renderAttachment = (att) => {
    const fullUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${att.url}`;
    if (att.type === 'image') {
      return <img src={fullUrl} alt={att.name} className="message-image" onClick={() => window.open(fullUrl, '_blank')} />;
    }
    if (att.type === 'audio') {
      return <AudioPlayer url={fullUrl} />;
    }
    return (
      <div className="message-document">
        <FileText className="doc-icon" size={24} />
        <div className="doc-info">
          <div className="doc-name">{att.name}</div>
          <div className="doc-size">{(att.size / 1024).toFixed(1)} KB</div>
        </div>
        <a href={fullUrl} download={att.name} target="_blank" rel="noreferrer" className="doc-download"><Download size={20} /></a>
      </div>
    );
  };

  return (
    <div className="messenger-layout fade-in">
      {/* Левая панель */}
      <div className={`chat-sidebar ${showSidebarOnMobile ? 'mobile-visible' : 'mobile-hidden'}`}>
        <div className="sidebar-header">
          <div className="current-user-info" onClick={() => setShowUserProfile(user)} style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'}} title="Открыть мой профиль и полученные подарки">
            <UserAvatar usr={user} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{fontWeight: 600}}>
                {renderUsernameWithBadge(user)}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Coins size={14} color="#f59e0b" /> {(user?.coins || 0).toLocaleString()} Coins
              </span>
            </div>
          </div>
          <div className="sidebar-actions">
            <button className="btn-icon" onClick={() => setDarkMode(!darkMode)} title="Сменить тему">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="btn-icon" title="Создать группу" onClick={() => setShowGroupModal(true)}><Users size={20} /></button>
            {(user.role === 'admin' || user.username === 'MilkyVIP') && (
              <button className="btn-icon" title="Админка" onClick={() => navigate('/admin')}><Settings size={20} /></button>
            )}
            <button className="btn-icon" title="Выход" onClick={handleLogout}><LogOut size={20} /></button>
          </div>
        </div>

        <div className="search-box">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input type="text" className="form-control" placeholder="Поиск пользователей..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
          </div>
        </div>

        {/* Stories Bar */}
        <div className="stories-container">
          <div className="stories-title">
            <span>Истории</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '2px' }} onClick={() => setShowAddStoryModal(true)}>
              <Plus size={14} /> Создать
            </span>
          </div>
          <div className="stories-scroll">
            {/* My Story Item */}
            <div className="story-item" onClick={() => {
              const myGroup = storiesFeed.find(g => String(g.user._id || g.user.id) === String(user.id));
              if (myGroup) {
                setActiveStoryViewer(myGroup);
                setActiveStoryIndex(0);
              } else {
                setShowAddStoryModal(true);
              }
            }}>
              <div className="add-story-avatar">
                {(() => {
                  const myGroup = storiesFeed.find(g => String(g.user._id || g.user.id) === String(user.id));
                  if (myGroup) {
                    return (
                      <div className="story-ring">
                        <UserAvatar usr={user} size="small" />
                      </div>
                    );
                  }
                  return (
                    <div style={{ position: 'relative' }}>
                      <UserAvatar usr={user} size="small" />
                      <div className="add-story-plus">+</div>
                    </div>
                  );
                })()}
              </div>
              <div className="story-item-name">Вы</div>
            </div>

            {/* Other Users' Stories */}
            {storiesFeed.filter(g => String(g.user._id || g.user.id) !== String(user.id)).map(group => {
              const hasUnviewed = group.stories.some(s => !s.views?.some(v => String(v.userId) === String(user.id)));
              return (
                <div key={group.user._id || group.user.id} className="story-item" onClick={() => {
                  setActiveStoryViewer(group);
                  setActiveStoryIndex(0);
                }}>
                  <div className={`story-ring ${hasUnviewed ? '' : 'viewed'}`}>
                    <UserAvatar usr={group.user} size="small" />
                  </div>
                  <div className="story-item-name">{group.user.username}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chat-list">
          {searchResults.length > 0 ? (
            <div className="search-results">
              <div className="list-title">Результаты поиска</div>
              {searchResults.map(foundUser => (
                <div key={foundUser.id} className={`chat-item ${foundUser.username === 'MilkyVIP' ? 'milky-vip-chat' : ''}`} onClick={() => handleStartChat(foundUser.id)}>
                  <UserAvatar usr={foundUser} />
                  <div className="chat-item-info">
                    <div className="chat-item-name">{renderUsernameWithBadge(foundUser.username, foundUser.isVerified)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600, marginTop: '2px' }}>@{foundUser.username}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : loadingChats ? (
            <div style={{ padding: '1rem' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
                  <div className="skeleton skeleton-avatar"></div>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text short"></div>
                    <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {chats.map(chat => {
                const chatName = getChatName(chat);
                const partner = getPartner(chat);
                return (
                  <div key={chat.id} className={`chat-item ${currentChat?.id === chat.id ? 'active' : ''} ${partner?.username === 'MilkyVIP' ? 'milky-vip-chat' : ''}`} onClick={() => {setCurrentChat(chat); setShowSidebarOnMobile(false);}}>
                    <div className="relative" onClick={(e) => { if(!chat.isGroup) { e.stopPropagation(); setShowUserProfile(partner); } }}>
                      {chat.isGroup ? <div className="avatar">👥</div> : <UserAvatar usr={partner} />}
                      {!chat.isGroup && partner?.status === 'online' && <span className="online-indicator"></span>}
                    </div>
                    <div className="chat-item-info">
                      <div className="chat-item-name">{renderUsernameWithBadge(chatName, !chat.isGroup && partner?.isVerified)}</div>
                      <div className="chat-item-last-msg">
                        {chat.lastMessage?.deletedForEveryone ? (
                          (user?.role === 'admin' || user?.username === 'MilkyVIP') ? (
                            <span style={{ color: '#ef4444' }}>🚫 <s style={{ opacity: 0.85 }}>{chat.lastMessage.text || 'Удаленное сообщение'}</s></span>
                          ) : (
                            <i>Сообщение удалено</i>
                          )
                        ) : (chat.lastMessage?.text || (chat.lastMessage?.attachments?.length ? 'Файл' : (!chat.isGroup && partner?.bio ? <span style={{fontStyle: 'italic', opacity: 0.8}}>{partner.bio}</span> : 'Нет сообщений')))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {chats.length === 0 && <div className="empty-state-text">У вас пока нет чатов</div>}
            </>
          )}
        </div>
        
        {/* Support Banner */}
        <div className="support-banner" onClick={() => {
          setSearchQuery('MilkyVIP');
          toast('Нажмите на профиль MilkyVIP в результатах поиска, чтобы начать чат!', { icon: '✨' });
        }} style={{
          padding: '12px 15px', 
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
          borderTop: '1px solid var(--border-color)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'background 0.2s',
          marginTop: 'auto'
        }}>
          <BadgeCheck size={24} color="#3b82f6" />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Есть вопросы?</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Напишите MilkyVIP</div>
          </div>
        </div>
      </div>

      {/* Правая панель */}
      <div className={`chat-window ${!showSidebarOnMobile ? 'mobile-visible' : 'mobile-hidden'}`} onClick={() => setShowEmojiPicker(false)}>
        {currentChat ? (
          <>
            <div className="chat-header slide-down">
              <div className="chat-header-info" onClick={() => !currentChat.isGroup && setShowUserProfile(getPartner(currentChat))} style={{cursor: !currentChat.isGroup ? 'pointer' : 'default'}}>
                <button className="btn-icon mobile-only" onClick={(e) => { e.stopPropagation(); setCurrentChat(null); setShowSidebarOnMobile(true); }}><ArrowLeft size={24} /></button>
                {currentChat.isGroup ? <div className="avatar small"><Users size={20} /></div> : <UserAvatar usr={getPartner(currentChat)} size="small" />}
                <div>
                  <div className={`chat-partner-name ${getPartner(currentChat)?.username === 'MilkyVIP' ? 'milky-vip-name' : ''}`}>{renderUsernameWithBadge(getChatName(currentChat), !currentChat.isGroup && getPartner(currentChat)?.isVerified)}</div>
                  <div className="chat-partner-status">
                    {currentChat.isGroup ? `${currentChat.participants.length} участников` : (getPartner(currentChat).status === 'online' ? 'В сети' : 'Был(а) недавно')}
                  </div>
                  {!currentChat.isGroup && getPartner(currentChat)?.bio && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getPartner(currentChat).bio}
                    </div>
                  )}
                </div>
              </div>
              
              {!currentChat.isGroup && (
                <div className="chat-call-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn-icon" style={{ color: '#ec4899' }} title="Отправить подарок / монеты" onClick={() => {
                    setGiftRecipient(getPartner(currentChat));
                    setShowGiftModal(true);
                  }}>
                    <Gift size={20} />
                  </button>
                  <button className="btn-icon call" onClick={() => callUser(getPartner(currentChat).id, false, user.username)}><Phone size={20} /></button>
                  <button className="btn-icon call" onClick={() => callUser(getPartner(currentChat).id, true, user.username)}><Video size={20} /></button>
                </div>
              )}
            </div>

            <div className="messages-area">
              {messages.map((msg) => {
                const actualSenderId = typeof msg.senderId === 'object' ? (msg.senderId.id || msg.senderId._id) : msg.senderId;
                const isOwn = actualSenderId === user.id;
                const msgTextContent = msg.text || msg.content || '';
                
                if (msg.deletedForEveryone) {
                  const isMilkyOrAdmin = user?.role === 'admin' || user?.username === 'MilkyVIP';
                  if (isMilkyOrAdmin) {
                    return (
                      <div key={msg.id || Math.random()} className={`message-wrapper ${isOwn ? 'own' : 'other'} slide-up`} onContextMenu={(e) => handleContextMenu(e, msg)}>
                        <div className="message-bubble deleted-vip" style={{ borderLeft: '3px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.12)', padding: '10px 14px', borderRadius: '12px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🚫 Удалено (Видно вам как MilkyVIP / Админ)</span>
                          </div>
                          {msg.attachments?.map((att, i) => <div key={i}>{renderAttachment(att)}</div>)}
                          {msgTextContent ? (
                            <div className="message-text" style={{ textDecoration: 'line-through', opacity: 0.9 }}>{msgTextContent}</div>
                          ) : (
                            <div style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>[Содержимое сообщения не было сохранено]</div>
                          )}
                          {renderReactions(msg.reactions)}
                          <div className="message-meta">
                            <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id || Math.random()} className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
                      <div className="message-bubble deleted"><i>🚫 Сообщение удалено</i></div>
                    </div>
                  );
                }

                const sender = currentChat.isGroup && !isOwn ? currentChat.participants.find(p => p && (p.id === actualSenderId || p._id === actualSenderId)) : null;

                const msgChatStyle = (typeof msg.senderId === 'object' && msg.senderId?.chatStyle) ? msg.senderId.chatStyle : (isOwn && user?.chatStyle ? user.chatStyle : '');
                const isGiftMessage = msg.content && (msg.content.includes('🎁') || msg.content.includes('🪙'));

                return (
                  <div key={msg.id || msg._id || Math.random()} id={`msg-${msg.id || msg._id}`} className={`message-wrapper ${isOwn ? 'own' : 'other'} slide-up`} onContextMenu={(e) => handleContextMenu(e, msg)}>
                    <div 
                      className={`message-bubble ${msgChatStyle ? `chat-style-${msgChatStyle}` : ''} ${isGiftMessage ? 'gift-msg-interactive' : ''}`}
                      onClick={() => {
                        if (isGiftMessage) {
                          setActiveGiftEffect({
                            icon: msg.content.includes('🎁') ? '🎁' : '🪙',
                            name: 'Подарок / Перевод',
                            coins: 100,
                            message: msg.content,
                            senderName: (typeof msg.senderId === 'object' && msg.senderId?.username) ? msg.senderId.username : 'Друг'
                          });
                        }
                      }}
                      style={isGiftMessage ? { cursor: 'pointer' } : {}}
                      title={isGiftMessage ? 'Нажмите для эффекта подарка!' : ''}
                    >
                      {sender && <div className="message-sender-name" onClick={() => setShowUserProfile(sender)} style={{cursor: 'pointer'}}>{renderUsernameWithBadge(sender.username, sender.isVerified)}</div>}
                      {msg.replyTo && (
                        <div
                          className="quoted-reply-box"
                          onClick={() => {
                            const el = document.getElementById(`msg-${msg.replyTo.id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          style={{
                            borderLeft: '3px solid var(--primary-color)',
                            padding: '4px 10px',
                            marginBottom: '6px',
                            background: 'rgba(99, 102, 241, 0.12)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.78rem' }}>{msg.replyTo.senderName}</div>
                          <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px', opacity: 0.9 }}>
                            {msg.replyTo.text}
                          </div>
                        </div>
                      )}
                      {msg.attachments?.map((att, i) => <div key={i}>{renderAttachment(att)}</div>)}
                      {msgTextContent && <div className="message-text">{msgTextContent}</div>}
                      {renderReactions(msg.reactions)}
                      <div className="message-meta">
                        {msg.isEdited && <span className="msg-edited">изменено </span>}
                        <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {renderMessageStatus(msg)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {partnerTyping && <div className="message-wrapper other"><div className="typing-indicator"><span></span><span></span><span></span></div></div>}
              <div ref={scrollRef}></div>
            </div>

            {contextMenu && (
              <div className="context-menu" ref={contextMenuRef} style={{ top: contextMenu.y, left: contextMenu.x }}>
                {(() => {
                  const actualSenderId = typeof contextMenu.message.senderId === 'object' 
                    ? (contextMenu.message.senderId.id || contextMenu.message.senderId._id) 
                    : contextMenu.message.senderId;
                  const isAuthor = actualSenderId === user.id;
                  
                  return (
                    <>
                      <div className="reactions-picker" style={{display: 'flex', gap: '8px', padding: '8px', borderBottom: '1px solid var(--border-color)', justifyContent: 'space-around', background: 'var(--bg-glass)'}}>
                        {['❤️', '👍', '👎', '😂', '😮', '😢', '🔥'].map(emoji => (
                          <span key={emoji} onClick={(e) => {
                            e.stopPropagation();
                            socketRef.current.emit('add_reaction', { messageId: contextMenu.message.id || contextMenu.message._id, chatId: currentChat.id, emoji });
                            setContextMenu(null);
                          }} style={{cursor: 'pointer', fontSize: '1.2rem', transition: 'transform 0.1s'}} onMouseEnter={(e) => e.target.style.transform='scale(1.3)'} onMouseLeave={(e) => e.target.style.transform='scale(1)'}>
                            {emoji}
                          </span>
                        ))}
                      </div>
                      <div className="context-item" onClick={() => handleReplyClick(contextMenu.message)} style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        <Reply size={16} /> Ответить
                      </div>
                      {isAuthor && (
                        <div className="context-item" onClick={handleEditClick} style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <Edit2 size={16} /> Редактировать
                        </div>
                      )}
                      {(isAuthor || user?.role === 'admin' || user?.username === 'MilkyVIP') && (
                        <div className="context-item delete" onClick={handleDeleteClick} style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <Trash2 size={16} /> Удалить у всех
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div className="chat-input-area relative">
              {selectedFile && (
                <div className="file-preview-banner">
                  <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Paperclip size={16} /> {selectedFile.name}</span>
                  <button className="btn-cancel-file" onClick={() => setSelectedFile(null)}><X size={18} /></button>
                </div>
              )}
              {replyingMessage && (
                <div className="reply-banner" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--primary-color)', borderRadius: '8px', marginBottom: '0.5rem'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden'}}>
                    <Reply size={16} color="var(--primary-color)" />
                    <div style={{fontSize: '0.85rem'}}>
                      <div style={{fontWeight: 700, color: 'var(--primary-color)'}}>Ответ для {replyingMessage.senderName}</div>
                      <div style={{color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px'}}>{replyingMessage.text}</div>
                    </div>
                  </div>
                  <button className="btn-cancel-edit btn-icon" onClick={() => setReplyingMessage(null)}><X size={16} /></button>
                </div>
              )}
              {editingMessage && (
                <div className="editing-banner" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '0.5rem'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Edit2 size={16} color="var(--primary-color)" />
                    <span style={{fontSize: '0.85rem'}}>Редактирование: <b>{editingMessage.text}</b></span>
                  </div>
                  <button className="btn-cancel-edit btn-icon" onClick={() => {setEditingMessage(null); setNewMessage('');}}><X size={16} /></button>
                </div>
              )}

              {showEmojiPicker && <div className="emoji-picker-container" ref={emojiPickerRef}><EmojiPicker onEmojiClick={onEmojiClick} theme={darkMode ? 'dark' : 'light'} /></div>}

              {(() => {
                const isChannelOrReadOnly = currentChat?.isChannel || currentChat?.isReadOnly;
                const canWriteInChat = !isChannelOrReadOnly || user?.role === 'admin' || user?.username === 'MilkyVIP' || (currentChat?.admins && currentChat.admins.some(a => (a.id || a._id || a) === user?.id));

                if (!canWriteInChat) {
                  return (
                    <div style={{
                      padding: '14px 20px',
                      textAlign: 'center',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <span>📢 Только администраторы могут отправлять сообщения в этот канал</span>
                    </div>
                  );
                }

                if (isRecording) {
                  return (
                    <div className="recording-ui">
                      <div className="recording-indicator"></div>
                      <div className="recording-time">{formatRecordingTime(recordingTime)}</div>
                      <button className="btn-trash" onClick={cancelRecording}><Trash size={20} /></button>
                      <button className="btn-send" onClick={stopRecordingAndSend}><Send size={20} /></button>
                    </div>
                  );
                }

                return (
                  <form onSubmit={(e) => handleSendMessage(e)} className="message-form">
                    <input type="file" ref={fileInputRef} style={{display: 'none'}} onChange={handleFileChange} />
                    <button type="button" className="btn-icon" onClick={() => fileInputRef.current.click()}><Paperclip size={20} /></button>
                    <button type="button" className="btn-icon" onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}><Smile size={20} /></button>
                    <input type="text" placeholder="Напишите сообщение..." value={newMessage} onChange={handleTyping} />
                    {newMessage.trim() || selectedFile ? (
                      <button type="submit" className="btn-send">
                        {editingMessage ? <Check size={20} /> : <Send size={20} />}
                      </button>
                    ) : (
                      <button type="button" className="btn-icon" onClick={startRecording}><Mic size={20} /></button>
                    )}
                  </form>
                );
              })()}
            </div>
          </>
        ) : (
          <div className="chat-placeholder fade-in mobile-hidden">
            <MessageSquare size={64} className="chat-placeholder-icon" />
            <h3>Выберите кому хотели бы написать</h3>
            <p>WoW Messenger - всегда на связи</p>
          </div>
        )}
      </div>

      {/* Модалка настроек */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content settings-modal" style={{ width: '90%', maxWidth: '600px', display: 'flex', flexDirection: 'row', padding: 0, overflow: 'hidden' }}>
            <div className="settings-sidebar" style={{ width: '200px', borderRight: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="settings-tabs-list">
                <li className={`settings-tab-btn ${settingsTab === 'profile' ? 'active' : ''}`} onClick={() => setSettingsTab('profile')}>Профиль</li>
                <li className={`settings-tab-btn ${settingsTab === 'privacy' ? 'active' : ''}`} onClick={() => setSettingsTab('privacy')}>Приватность</li>
                <li className={`settings-tab-btn ${settingsTab === 'notifications' ? 'active' : ''}`} onClick={() => setSettingsTab('notifications')}>Уведомления</li>
                <li className={`settings-tab-btn ${settingsTab === 'appearance' ? 'active' : ''}`} onClick={() => setSettingsTab('appearance')}>Внешний вид</li>
              </ul>
            </div>
            
            <div className="settings-content" style={{ flex: 1, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Настройки</h3>
                <button className="btn-icon" onClick={() => setShowSettingsModal(false)}><X size={20} /></button>
              </div>
              
              {settingsTab === 'profile' && (
                <div className="settings-tab slide-in">
                  <div className="form-group">
                    <label>Имя пользователя</label>
                    <input type="text" className="form-control" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>О себе (Bio)</label>
                    <input type="text" className="form-control" value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Аватар</label>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '5px' }}>
                      <UserAvatar usr={{...user, avatarUrl: profileData.avatarUrl}} size="large" />
                      <label className="btn btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
                        Выбрать фото
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleAvatarUpload} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'privacy' && (
                <div className="settings-tab slide-in">
                  <label className="toggle-label" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span>Показывать статус "В сети"</span>
                    <input type="checkbox" checked={profileData.settings.showOnlineStatus} onChange={e => setProfileData({...profileData, settings: {...profileData.settings, showOnlineStatus: e.target.checked}})} />
                  </label>
                  <label className="toggle-label" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span>Показывать статус "Был в сети"</span>
                    <input type="checkbox" checked={profileData.settings.showLastSeen} onChange={e => setProfileData({...profileData, settings: {...profileData.settings, showLastSeen: e.target.checked}})} />
                  </label>
                  <label className="toggle-label" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                    <span>Отправлять отчеты о прочтении</span>
                    <input type="checkbox" checked={profileData.settings.readReceipts} onChange={e => setProfileData({...profileData, settings: {...profileData.settings, readReceipts: e.target.checked}})} />
                  </label>
                </div>
              )}

              {settingsTab === 'notifications' && (
                <div className="settings-tab slide-in">
                  <label className="toggle-label" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                    <span>Разрешить Push-уведомления</span>
                    <input type="checkbox" checked={profileData.settings.allowPushNotifications} onChange={e => setProfileData({...profileData, settings: {...profileData.settings, allowPushNotifications: e.target.checked}})} />
                  </label>
                </div>
              )}

              {settingsTab === 'appearance' && (
                <div className="settings-tab slide-in">
                  <div className="form-group">
                    <label>Тема оформления</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" className={`btn ${!darkMode ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDarkMode(false)}>Светлая</button>
                      <button type="button" className={`btn ${darkMode ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDarkMode(true)}>Темная</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Цвет акцента</label>
                    <input 
                      type="color" 
                      value={profileData.settings.accentColor} 
                      onChange={e => setProfileData({...profileData, settings: {...profileData.settings, accentColor: e.target.value}})}
                      style={{ width: '100%', height: '40px', padding: '0', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                    />
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowSettingsModal(false)}>Отмена</button>
                <button className="btn btn-primary" onClick={handleProfileUpdate}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group / Channel Modal */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Создание</h3>
              <button className="btn-icon" onClick={() => setShowGroupModal(false)}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`btn ${!isChannelCreation ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setIsChannelCreation(false)}
              >
                <Users size={16} /> 👥 Группа
              </button>
              <button
                type="button"
                className={`btn ${isChannelCreation ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setIsChannelCreation(true)}
              >
                <MessageSquare size={16} /> 📢 Канал
              </button>
            </div>

            {isChannelCreation && (
              <div style={{ fontSize: '0.85rem', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.12)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', borderLeft: '4px solid #3b82f6' }}>
                📢 <b>Режим канала:</b> Публиковать сообщения в канал сможете только вы и назначенные администраторы. Обычные участники читают посты.
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>
                {isChannelCreation ? 'Название канала' : 'Название группы'}
              </label>
              <input
                type="text"
                className="form-control"
                placeholder={isChannelCreation ? 'Например: 📢 Канал Новинок' : 'Например: 💬 Общий Чат'}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="group-users-list">
              <h4 style={{ fontSize: '0.9rem', margin: '10px 0 6px 0' }}>Выберите участников из контактов</h4>
              <input type="text" className="form-control" placeholder="Поиск участников..." onChange={(e) => setSearchQuery(e.target.value)}/>
              <div className="group-search-results" style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '8px' }}>
                {searchResults.map(u => (
                  <label key={u.id} className="group-user-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedGroupUsers.includes(u.id)} onChange={() => handleToggleGroupUser(u.id)}/>
                    {renderUsernameWithBadge(u.username, u.isVerified)}
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>Отмена</button>
              <button
                className="btn btn-primary"
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
              >
                ➕ Создать {isChannelCreation ? 'Канал' : 'Группу'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram-Style User Profile Modal with Gift Showcase */}
      {showUserProfile && (
        <div className="tg-profile-overlay" onClick={() => setShowUserProfile(null)}>
          <div className={`tg-profile-card fade-in ${showUserProfile.profileAura && showUserProfile.profileAura !== 'none' ? `aura-${showUserProfile.profileAura}` : ''}`} onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="tg-profile-header">
              <button className="tg-profile-close" onClick={() => setShowUserProfile(null)}><X size={18} /></button>
              <div className="tg-profile-avatar-box">
                <UserAvatar usr={showUserProfile} size="large" />
              </div>
              <div className="tg-profile-name">
                {renderUsernameWithBadge(showUserProfile.username, showUserProfile.isVerified, showUserProfile.nameColor, showUserProfile.badges, showUserProfile.userTitle)}
              </div>
              <div className="tg-profile-status">
                {showUserProfile.status === 'online' ? '🟢 в сети' : '⚪ был(а) недавно'}
              </div>
            </div>

            <div className="tg-profile-body">
              <div className="tg-info-row">
                <div className="tg-info-icon"><AtSign size={18} /></div>
                <div>
                  <div className="tg-info-label">Имя пользователя (Username)</div>
                  <div className="tg-info-val" style={{ color: '#3b82f6', fontWeight: 700 }}>@{showUserProfile.username}</div>
                </div>
              </div>

              <div className="tg-info-row">
                <div className="tg-info-icon"><MessageSquare size={18} /></div>
                <div>
                  <div className="tg-info-label">О себе (Bio)</div>
                  <div className="tg-info-val">{showUserProfile.bio || 'Информация не указана'}</div>
                </div>
              </div>

              <div className="tg-info-row">
                <div className="tg-info-icon"><Coins size={18} /></div>
                <div>
                  <div className="tg-info-label">Баланс монет</div>
                  <div className="tg-info-val" style={{ color: '#f59e0b', fontWeight: 800, fontSize: '1.1rem' }}>
                    🪙 {(showUserProfile.coins || 0).toLocaleString()} Coins
                  </div>
                </div>
              </div>

              {/* 🎁 Секция полученных подарков с подробным счетчиком и анимацией */}
              <div style={{ marginTop: '16px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    🎁 Коллекция подарков ({showUserProfile.giftsReceived?.length || 0})
                  </span>
                  {showUserProfile.giftsReceived?.length > 0 && (
                    <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>
                      🪙 {showUserProfile.giftsReceived.reduce((sum, g) => sum + (g.coins || 0), 0).toLocaleString()} coins
                    </span>
                  )}
                </div>

                {Array.isArray(showUserProfile.giftsReceived) && showUserProfile.giftsReceived.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {showUserProfile.giftsReceived.map((g, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setActiveGiftEffect({
                          icon: g.giftIcon || '🎁',
                          name: g.giftName,
                          coins: g.coins,
                          message: g.message,
                          senderName: g.fromUsername
                        })}
                        style={{ background: 'var(--bg-primary)', padding: '8px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'transform 0.15s' }}
                        title="Нажмите для просмотра эффекта подарка!"
                      >
                        <div style={{ fontSize: '1.8rem', marginBottom: '2px' }}>{g.giftIcon || '🎁'}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.giftName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>От: @{g.fromUsername}</div>
                        {g.message && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>"{g.message}"</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '15px 10px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    🎁 У этого пользователя пока нет подарков.<br />
                    {showUserProfile?.username !== user?.username && 'Будьте первым, кто подарит подарок!'}
                  </div>
                )}
              </div>

              {/* Кнопки действий */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                {showUserProfile?.username === user?.username ? (
                  <>
                    <button className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #f59e0b, #d97706)', fontWeight: 700 }} onClick={() => {
                      setShowUserProfile(null);
                      fetchStoreAndOpen();
                    }}>
                      🛍️ Открыть Магазин & Заработок
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                      setShowUserProfile(null);
                      setShowSettingsModal(true);
                    }}>
                      ⚙️ Профиль
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                      handleStartChat(showUserProfile.id || showUserProfile._id);
                      setShowUserProfile(null);
                    }}>
                      💬 Написать сообщение
                    </button>
                    <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none' }} onClick={() => {
                      setGiftRecipient(showUserProfile);
                      setShowGiftModal(true);
                    }}>
                      🎁 Подарить
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Официальный Магазин WoW */}
      {showStoreModal && (
        <div className="modal-overlay" onClick={() => setShowStoreModal(false)}>
          <div className="modal-content store-modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={24} color="#f59e0b" />
                <h2 style={{ margin: 0 }}>🛍️ Официальный Магазин WoW</h2>
              </div>
              <button className="btn-icon" onClick={() => setShowStoreModal(false)}><X size={20} /></button>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(245, 158, 11, 0.15))', padding: '14px 18px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 15px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ваш текущий баланс: </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b', textShadow: '0 0 10px rgba(245, 158, 11, 0.4)' }}>
                  🪙 {(storeData?.userCoins || 0).toLocaleString()} Coins
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.8, color: 'var(--text-primary)' }}>
                Пополнение через переводы & комиссии
              </div>
            </div>

            {/* Вкладки Магазина Предметов & Заработка */}
            <div className="store-tabs">
              <button className={`store-tab-btn ${activeStoreTab === 'clicker' ? 'active' : ''}`} onClick={() => setActiveStoreTab('clicker')}>
                ⚡ Кликер
              </button>
              <button className={`store-tab-btn ${activeStoreTab === 'quiz' ? 'active' : ''}`} onClick={() => setActiveStoreTab('quiz')}>
                📖 Викторина
              </button>
              <button className={`store-tab-btn ${activeStoreTab === 'quests' ? 'active' : ''}`} onClick={() => setActiveStoreTab('quests')}>
                🎯 Квесты
              </button>
              <button className={`store-tab-btn ${activeStoreTab === 'frames' ? 'active' : ''}`} onClick={() => setActiveStoreTab('frames')}>
                🖼️ Рамки
              </button>
              <button className={`store-tab-btn ${activeStoreTab === 'nameColors' ? 'active' : ''}`} onClick={() => setActiveStoreTab('nameColors')}>
                🎨 Цвет ника
              </button>
              <button className={`store-tab-btn ${activeStoreTab === 'titles' ? 'active' : ''}`} onClick={() => setActiveStoreTab('titles')}>
                👑 Титулы
              </button>
              <button className={`store-tab-btn ${activeStoreTab === 'auras' ? 'active' : ''}`} onClick={() => setActiveStoreTab('auras')}>
                ✨ Ауры
              </button>
              <button className={`store-tab-btn ${activeStoreTab === 'chatStyles' ? 'active' : ''}`} onClick={() => setActiveStoreTab('chatStyles')}>
                💬 Стили
              </button>
              <button className={`store-tab-btn ${activeStoreTab === 'badges' ? 'active' : ''}`} onClick={() => setActiveStoreTab('badges')}>
                🏅 Значки
              </button>
              <button className={`store-tab-btn ${activeStoreTab === 'gifts' ? 'active' : ''}`} onClick={() => { setShowStoreModal(false); setShowGiftModal(true); }}>
                🎁 Подарки
              </button>
            </div>

            {/* Вкладка 1: Заработок Монет (Кликер) */}
            {activeStoreTab === 'clicker' && (
              <div style={{ textAlign: 'center', padding: '10px 5px' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(59, 130, 246, 0.15))', borderRadius: '18px', padding: '16px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Coins size={22} color="#f59e0b" /> Ежедневная Награда
                  </h3>
                  <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Забирайте бесплатные монеты каждые 24 часа!
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    disabled={!storeData?.canClaimDaily}
                    onClick={handleClaimDaily}
                  >
                    <Sparkles size={18} />
                    {storeData?.canClaimDaily ? 'Забрать +50 Монет 🎁' : 'Забрано на сегодня ✅'}
                  </button>
                </div>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '18px', padding: '20px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Zap size={22} color="#3b82f6" /> Монетный Тапер (Lv. {storeData?.clickerLevel || 1})
                  </h3>
                  <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Нажимайте на монету! Каждая прокачка увеличивает доход на +1 🪙 за клик!
                  </p>

                  <div className="tap-button-wrapper" style={{ position: 'relative', display: 'inline-block', margin: '15px 0' }}>
                    <div
                      className="tap-button"
                      onClick={handleTapCoin}
                      style={{
                        width: '105px',
                        height: '105px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #fbbf24 0%, #d97706 70%, #92400e 100%)',
                        boxShadow: '0 0 25px rgba(245, 158, 11, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        margin: '0 auto',
                        transition: 'transform 0.1s ease',
                        userSelect: 'none'
                      }}
                    >
                      <Coins size={54} color="#ffffff" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
                    </div>
                    {tapFloats.map(f => (
                      <div key={f.id} className="tap-float-number" style={{ position: 'absolute', left: f.x, top: f.y, color: '#f59e0b', fontWeight: 900, fontSize: '1.2rem', pointerEvents: 'none' }}>
                        {f.text}
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '12px' }}
                    onClick={handleUpgradeClicker}
                  >
                    <Zap size={18} />
                    <span>Прокачать доход за клик (Стоимость: {Math.round(Math.pow(storeData?.clickerLevel || 1, 1.5) * 100)} 🪙)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Вкладка 2: Викторина Знаний */}
            {activeStoreTab === 'quiz' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: '0 0 4px', color: '#f59e0b' }}>📖 Викторина Знаний</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Отвечайте правильно на вопросы и получайте монеты умом!
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {(storeData?.quizQuestions || [
                    { id: 1, question: 'Какая планета называется Красной планетой?', options: ['Марс', 'Венера', 'Юпитер'], correct: 0, reward: 15 },
                    { id: 2, question: 'Что из перечисленного является столицей Франции?', options: ['Париж', 'Берлин', 'Рим'], correct: 0, reward: 15 },
                    { id: 3, question: 'Сколько секунд в одной минуте?', options: ['60 секунд', '100 секунд', '30 секунд'], correct: 0, reward: 15 },
                    { id: 4, question: 'Какая химическая формула у чистой воды?', options: ['H2O', 'CO2', 'NaCl'], correct: 0, reward: 20 },
                    { id: 5, question: 'Какой океан является самым большим на Земле?', options: ['Тихий океан', 'Атлантический', 'Индийский'], correct: 0, reward: 25 }
                  ]).map(q => (
                    <div key={q.id} style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '10px' }}>
                        📖 {q.question} <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>(+🪙 {q.reward})</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {q.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            className="btn btn-secondary"
                            style={{ textAlign: 'left', padding: '8px 12px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onClick={() => handleAnswerQuiz(q.id, optIdx)}
                          >
                            <span>{opt}</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Ответить →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Вкладка 3: Квесты */}
            {activeStoreTab === 'quests' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: '0 0 4px', color: '#10b981' }}>🎯 Ежедневные Задания & Квесты</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Выполняйте простые задания и получайте заслуженную награду коинами!
                  </p>
                </div>

                <div className="quests-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(storeData?.quests || [
                    { id: 'quest_first_msg', title: '💬 Пожелать удачи в чате', reward: 15, icon: '💬', desc: 'Отправьте приветствие в любой чат' },
                    { id: 'quest_send_gift', title: '🎁 Сделать подарок другу', reward: 30, icon: '🎁', desc: 'Подарите подарок другу' },
                    { id: 'quest_click_100', title: '⚡ Натапать 100 кликов в сфере', reward: 25, icon: '⚡', desc: 'Сделайте 100 кликов в кликере' },
                    { id: 'quest_quiz', title: '📖 Пройти Викторину Знаний', reward: 20, icon: '📖', desc: 'Ответьте правильно на вопросы викторины' },
                    { id: 'quest_milky_fan', title: '👑 Поприветствовать MilkyVIP', reward: 50, icon: '👑', desc: 'Отправьте сообщение Меценату MilkyVIP' },
                  ]).map(q => {
                    const isDone = storeData?.completedQuests?.includes(q.id);
                    return (
                      <div key={q.id} style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontSize: '1.8rem' }}>{q.icon}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{q.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{q.desc}</div>
                          </div>
                        </div>

                        <div>
                          {isDone ? (
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>Выполнено ✅</span>
                          ) : (
                            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '10px' }} onClick={() => handleClaimQuest(q.id)}>
                              +🪙 {q.reward}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Карточки предметов Магазина (Рамки, Ник, Значки, Титулы, Ауры, Стили сообщений) */}
            {['frames', 'nameColors', 'badges', 'titles', 'auras', 'chatStyles'].includes(activeStoreTab) && (
              <div className="store-items-grid">
                {(storeData?.catalog?.[activeStoreTab] || []).map(item => {
                  const isOwned = storeData?.userInventory?.includes(item.id);
                  const isEquipped = storeData?.equippedFrame === item.id || 
                    storeData?.equippedColor === item.id || 
                    storeData?.equippedTitle === item.title || 
                    storeData?.equippedAura === item.id || 
                    storeData?.equippedChatStyle === item.id;

                  return (
                    <div key={item.id} className={`store-item-card ${isEquipped ? 'equipped' : ''}`}>
                      <div style={{ margin: '10px 0', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {activeStoreTab === 'frames' && (
                          <UserAvatar usr={{ username: user?.username, avatarUrl: user?.avatarUrl, avatarFrame: item.id, profileAura: 'none' }} size="default" />
                        )}
                        {activeStoreTab === 'nameColors' && (
                          <span className={`name-color-${item.id}`} style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                            {user?.username || 'Пользователь'}
                          </span>
                        )}
                        {activeStoreTab === 'badges' && (
                          <span className="badge-tag" style={{ fontSize: '1rem', padding: '4px 12px' }}>{item.badge}</span>
                        )}
                        {activeStoreTab === 'titles' && (
                          <span className="user-title-tag" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>{item.title}</span>
                        )}
                        {activeStoreTab === 'auras' && (
                          <UserAvatar usr={{ username: user?.username, avatarUrl: user?.avatarUrl, avatarFrame: 'none', profileAura: item.id }} size="default" />
                        )}
                        {activeStoreTab === 'chatStyles' && (
                          <div className={`message-bubble chat-style-${item.id}`} style={{ padding: '8px 14px', borderRadius: '14px', fontSize: '0.85rem' }}>
                            Сообщение ✨
                          </div>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>{item.description || ''}</div>

                      {isOwned ? (
                        <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} disabled={isEquipped} onClick={() => handleEquipItem(item.id, activeStoreTab)}>
                          {isEquipped ? 'Надето ✅' : 'Надеть'}
                        </button>
                      ) : (
                        <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '6px', background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => handleBuyItem(item.id, activeStoreTab)}>
                          🪙 {item.price} Coins
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно отправки подарка */}
      {showGiftModal && (
        <div className="modal-overlay" onClick={() => setShowGiftModal(false)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={22} color="#10b981" />
                <h2>Преподнести Подарок Другу</h2>
              </div>
              <button className="btn-icon" onClick={() => setShowGiftModal(false)}><X size={20} /></button>
            </div>

            <div style={{ margin: '15px 0' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Выберите подарок из каталога:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {(storeData.catalog?.gifts || [
                  { id: 'gift_star', name: 'Telegram Star', price: 500, icon: '⭐️', rarity: 'Limited', totalIssued: 5000 },
                  { id: 'gift_bear', name: 'Plush Bear', price: 1500, icon: '🧸', rarity: 'Rare', totalIssued: 2500 },
                  { id: 'gift_heart', name: 'Crystal Heart', price: 2500, icon: '💖', rarity: 'Rare', totalIssued: 1500 },
                  { id: 'gift_ring', name: 'Diamond Ring', price: 5000, icon: '💍', rarity: 'Epic', totalIssued: 1000 },
                  { id: 'gift_rocket', name: 'Cosmic Rocket', price: 10000, icon: '🚀', rarity: 'Epic', totalIssued: 500 },
                  { id: 'gift_crown', name: 'Imperial Crown', price: 25000, icon: '👑', rarity: 'Legendary', totalIssued: 250 },
                  { id: 'gift_car', name: 'Cyber Roadster', price: 50000, icon: '🏎️', rarity: 'Exclusive', totalIssued: 100 },
                  { id: 'gift_yacht', name: 'Luxury Yacht', price: 100000, icon: '🛥️', rarity: 'Exclusive', totalIssued: 50 },
                  { id: 'gift_planet', name: 'Golden Planet', price: 250000, icon: '🪐', rarity: 'Unique', totalIssued: 10 }
                ]).map(g => (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGiftId(g.id)}
                    style={{
                      position: 'relative',
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: selectedGiftId === g.id ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedGiftId === g.id ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: selectedGiftId === g.id ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* TG Rarity Badge */}
                    <span style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: g.rarity === 'Unique' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 
                                  g.rarity === 'Exclusive' ? 'linear-gradient(135deg, #ef4444, #f59e0b)' :
                                  g.rarity === 'Legendary' ? 'linear-gradient(135deg, #f59e0b, #eab308)' :
                                  g.rarity === 'Epic' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : '#3b82f6',
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}>
                      {g.rarity || 'Limited'}
                    </span>

                    <div style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))', margin: '4px 0 2px' }}>{g.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 900, marginTop: '2px' }}>🪙 {g.price.toLocaleString()}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>1 of {g.totalIssued || 1000}</div>
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: '15px' }}>
                <label>Пожелание получателю (необязательно)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="От чистого сердца! 😊"
                  value={giftMsg}
                  onChange={e => setGiftMsg(e.target.value)}
                />
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '10px 14px', borderRadius: '12px', marginTop: '14px', fontSize: '0.82rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Coins size={22} color="#f59e0b" />
                <div>
                  <div style={{ fontWeight: 800 }}>Комиссия системы: 10%</div>
                  <div style={{ fontSize: '0.76rem', opacity: 0.85 }}>10% от суммы подарка или перевода зачисляется Создателю (мне).</div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowGiftModal(false)}>Отмена</button>
              <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={handleSendGiftOrCoins}>
                🎁 Преподнести Подарок
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Modals (Incoming/Active) */}
      {callState.isReceivingCall && !callState.callAccepted && (
        <div className="modal-overlay">
          <div className="incoming-call-modal">
            <div className="caller-avatar pulse">{callState.callerName.charAt(0).toUpperCase()}</div>
            <h3>Входящий {callState.isVideo ? 'видеозвонок' : 'звонок'}...</h3>
            <p>{callState.callerName} звонит вам</p>
            <div className="call-actions-row">
              <button className="btn-call accept" onClick={answerCall}><Phone size={20} /> Принять</button>
              <button className="btn-call reject" onClick={rejectCall}><PhoneOff size={20} /> Отклонить</button>
            </div>
          </div>
        </div>
      )}
      {!callState.callEnded && (callState.callAccepted || !callState.isReceivingCall) && (
        <div className="active-call-overlay fade-in">
          <div className="call-video-container">
            {callState.isVideo ? (
              <video playsInline autoPlay ref={remoteVideoRef} className="remote-video" />
            ) : (
              <>
                <audio autoPlay ref={remoteVideoRef} />
                <div className="audio-only-avatar" style={{
                  width: '120px', height: '120px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, #818cf8 100%)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '3rem', fontWeight: 'bold', animation: 'pulse-ring 2s infinite'
                }}>
                  {callState.callerName ? callState.callerName.charAt(0).toUpperCase() : getPartner(currentChat)?.username?.charAt(0).toUpperCase()}
                </div>
              </>
            )}

          </div>
          <div className="call-controls">
            <button className={`btn-call-control ${isAudioMuted ? 'muted' : ''}`} onClick={() => setIsAudioMuted(!toggleAudio())}>
              <Mic size={24} />
            </button>
            {callState.isVideo && <button className={`btn-call-control ${isVideoMuted ? 'muted' : ''}`} onClick={() => setIsVideoMuted(!toggleVideo())}>
              <Video size={24} />
            </button>}
            <button className="btn-call reject" onClick={() => leaveCall(callState.isReceivingCall ? callState.callerId : getPartner(currentChat).id)}>
              <PhoneOff size={20} /> Завершить
            </button>
          </div>
        </div>
      )}
      <video 
        playsInline 
        autoPlay 
        muted 
        ref={localVideoRef} 
        className="local-video" 
        style={{ display: (!callState.callEnded && callState.isVideo) ? 'block' : 'none', zIndex: 510 }} 
      />

      {/* Add Story Modal */}
      {showAddStoryModal && (
        <div className="modal-overlay" onClick={() => setShowAddStoryModal(false)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>✨ Создать историю</h3>
              <button className="btn-icon" onClick={() => setShowAddStoryModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={`btn ${newStoryType === 'text' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setNewStoryType('text')}>
                  <Palette size={16} /> Текст
                </button>
                <button className={`btn ${newStoryType !== 'text' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setNewStoryType('image')}>
                  <Image size={16} /> Фото / Видео
                </button>
              </div>

              {newStoryType === 'text' ? (
                <>
                  <div style={{
                    background: newStoryBg,
                    height: '180px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                  }}>
                    {newStoryText || 'Введите ваш текст ниже...'}
                  </div>

                  <div className="form-group">
                    <label>Текст истории</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="О чем вы думаете? ✨"
                      value={newStoryText}
                      onChange={e => setNewStoryText(e.target.value)}
                      maxLength={150}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Цвет фона</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      {[
                        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)',
                        'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                        'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
                      ].map((bg, idx) => (
                        <div
                          key={idx}
                          onClick={() => setNewStoryBg(bg)}
                          style={{
                            background: bg,
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            border: newStoryBg === bg ? '3px solid white' : 'none'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <label className="story-file-upload-box">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={handleStoryFileUpload}
                    />
                    {uploadingStoryFile ? (
                      <div>⏳ Загрузка файла...</div>
                    ) : newStoryMediaUrl ? (
                      <div style={{ width: '100%', textAlign: 'center' }}>
                        {newStoryType === 'video' || newStoryMediaUrl.match(/\.(mp4|webm|mov|avi)$/i) ? (
                          <video src={newStoryMediaUrl.startsWith('http') ? newStoryMediaUrl : `${import.meta.env.VITE_API_URL || ''}${newStoryMediaUrl}`} controls style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '8px' }} />
                        ) : (
                          <img src={newStoryMediaUrl.startsWith('http') ? newStoryMediaUrl : `${import.meta.env.VITE_API_URL || ''}${newStoryMediaUrl}`} alt="preview" style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '8px', objectFit: 'cover' }} />
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '6px', fontWeight: 'bold' }}>✓ Файл выбран (нажмите для замены)</div>
                      </div>
                    ) : (
                      <>
                        <Upload size={28} color="#3b82f6" />
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          Выберите фото или видео с устройства
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Нажмите для выбора из файлов / галереи
                        </div>
                      </>
                    )}
                  </label>

                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '0.8rem' }}>Или вставьте ссылку на файл</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://example.com/video.mp4"
                      value={newStoryMediaUrl}
                      onChange={e => setNewStoryMediaUrl(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Подпись к истории</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Добавьте описание..."
                      value={newStoryText}
                      onChange={e => setNewStoryText(e.target.value)}
                    />
                  </div>
                </>
              )}

              <button className="btn btn-primary" onClick={handleAddStory} style={{ width: '100%', marginTop: '10px' }}>
                🚀 Опубликовать на 24 часа
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStoryViewer && (
        <div className="story-modal-overlay" onClick={() => setActiveStoryViewer(null)}>
          {(() => {
            const currentStory = activeStoryViewer.stories[activeStoryIndex];
            if (!currentStory) return null;
            const isOwner = String(currentStory.userId?._id || currentStory.userId?.id || currentStory.userId) === String(user.id);
            const isAdmin = user.role === 'admin' || user.username === 'MilkyVIP';

            return (
              <div className="story-viewer-box" onClick={e => e.stopPropagation()} style={{ background: currentStory.backgroundColor || 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
                {/* Progress Segments */}
                <div className="story-progress-segments">
                  {activeStoryViewer.stories.map((s, idx) => (
                    <div key={s.id || s._id || idx} className="story-progress-segment">
                      <div className={`story-progress-fill ${idx < activeStoryIndex ? 'active' : ''}`} style={{
                        width: idx === activeStoryIndex ? '100%' : (idx < activeStoryIndex ? '100%' : '0%'),
                        transition: idx === activeStoryIndex ? 'width 5s linear' : 'none'
                      }}></div>
                    </div>
                  ))}
                </div>

                {/* Header */}
                <div className="story-header">
                  <div className="story-author-info">
                    <UserAvatar usr={activeStoryViewer.user} size="small" />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {renderUsernameWithBadge(activeStoryViewer.user.username, activeStoryViewer.user.isVerified)}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {(isOwner || isAdmin) && (
                      <button className="btn-icon" title="Удалить историю" style={{ color: '#ef4444' }} onClick={() => handleDeleteStory(currentStory.id || currentStory._id)}>
                        <Trash2 size={18} />
                      </button>
                    )}
                    <button className="btn-icon" onClick={() => setActiveStoryViewer(null)}><X size={22} /></button>
                  </div>
                </div>

                {/* Body & Navigation */}
                <div className="story-body">
                  <div className="story-nav-btn left" onClick={handlePrevStory}></div>
                  <div className="story-nav-btn right" onClick={handleNextStory}></div>

                  {currentStory.mediaUrl ? (
                    <div style={{ textAlign: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      {currentStory.mediaType === 'video' || currentStory.mediaUrl.match(/\.(mp4|webm|mov|avi)$/i) ? (
                        <video
                          src={currentStory.mediaUrl.startsWith('http') ? currentStory.mediaUrl : `${import.meta.env.VITE_API_URL || ''}${currentStory.mediaUrl}`}
                          autoPlay
                          playsInline
                          loop
                          className="story-media-video"
                        />
                      ) : (
                        <img
                          src={currentStory.mediaUrl.startsWith('http') ? currentStory.mediaUrl : `${import.meta.env.VITE_API_URL || ''}${currentStory.mediaUrl}`}
                          alt="story"
                          className="story-media-img"
                        />
                      )}
                      {currentStory.text && <div className="story-text-display" style={{ marginTop: '15px', fontSize: '1.1rem' }}>{currentStory.text}</div>}
                    </div>
                  ) : (
                    <div className="story-text-display">{currentStory.text}</div>
                  )}
                </div>

                {/* Footer Reply / Views */}
                <div className="story-footer-reply">
                  {isOwner ? (
                    <div style={{ color: 'white', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', margin: 'auto', opacity: 0.9 }}>
                      <Eye size={16} /> Просмотров: {currentStory.views?.length || 0}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="story-reply-input"
                        placeholder="Ответить на историю..."
                        value={storyReplyText}
                        onChange={e => setStoryReplyText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSendStoryReply();
                        }}
                      />
                      <button className="btn-icon" style={{ background: '#3b82f6', color: 'white', borderRadius: '50%', width: '36px', height: '36px' }} onClick={handleSendStoryReply}>
                        <Send size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 🎁 Оверлей взрывного визуального эффекта подарков */}
      {activeGiftEffect && (
        <GiftEffectOverlay
          gift={activeGiftEffect}
          senderName={activeGiftEffect.senderName}
          onClose={() => setActiveGiftEffect(null)}
        />
      )}
    </div>
  );
};
export default Chat;
