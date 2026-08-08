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
  Plus, Sparkles, Eye, Image, Palette, ChevronLeft, ChevronRight
} from 'lucide-react';
import { playMessageSound, startRingtone, stopRingtone } from '../utils/sound';
import toast from 'react-hot-toast';
import { requestFCMToken, onForegroundMessage } from '../firebase';

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
  const [contextMenu, setContextMenu] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(null);
  
  // Group creation states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

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

  // Phase 5 States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [profileData, setProfileData] = useState({ 
    username: user.username, 
    bio: user.bio || '', 
    avatarUrl: user.avatarUrl || '',
    settings: user.settings || { 
      showOnlineStatus: true, 
      showLastSeen: true, 
      allowPushNotifications: true, 
      readReceipts: true, 
      accentColor: '#4f46e5' 
    }
  });
  const [selectedFile, setSelectedFile] = useState(null);
  
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
      return toast.error('Заполните текст или укажите ссылку на изображение');
    }
    const toastId = toast.loading('Публикация истории...');
    try {
      await axios.post('/api/stories', {
        text: newStoryText,
        mediaUrl: newStoryMediaUrl,
        mediaType: newStoryMediaUrl ? 'image' : 'text',
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

  const handleCreateGroup = async () => {
    if (!groupName || selectedGroupUsers.length === 0) return;
    try {
      const res = await axios.post('/api/chats/group', { name: groupName, users: selectedGroupUsers });
      const chat = res.data;
      setChats([chat, ...chats]);
      setCurrentChat(chat);
      setShowGroupModal(false);
      setGroupName('');
      setSelectedGroupUsers([]);
      setShowSidebarOnMobile(false);
    } catch (error) {
      console.error('Ошибка создания группы:', error);
    }
  };

  const handleToggleGroupUser = (userId) => {
    setSelectedGroupUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
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
        attachments: attachmentData ? [attachmentData] : []
      };
      socketRef.current.emit('send_message', messageData);
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
    const actualSenderId = typeof msg.senderId === 'object' ? (msg.senderId.id || msg.senderId._id) : msg.senderId;
    if ((actualSenderId === user.id || user.role === 'admin') && !msg.deletedForEveryone) {
      setContextMenu({ message: msg, x: e.clientX, y: e.clientY });
    }
  };

  const handleEditClick = () => {
    setEditingMessage(contextMenu.message);
    setNewMessage(contextMenu.message.text);
    setContextMenu(null);
  };

  const handleDeleteClick = () => {
    socketRef.current.emit('delete_message', { chatId: currentChat.id, messageId: contextMenu.message.id });
    setContextMenu(null);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    const toastId = toast.loading('Загрузка аватара...');
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      const newAvatarUrl = res.data.url;
      setProfileData({ ...profileData, avatarUrl: newAvatarUrl });
      
      // Авто-сохранение аватара
      const updateRes = await axios.put('/api/users/profile', { ...profileData, avatarUrl: newAvatarUrl });
      setUser(prev => {
        const updatedUser = { ...prev, ...updateRes.data };
        localStorage.setItem('wow_user', JSON.stringify(updatedUser));
        return updatedUser;
      });

      toast.success('Аватар загружен и сохранен!', { id: toastId });
    } catch (err) {
      toast.error('Ошибка загрузки аватара', { id: toastId });
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

  const UserAvatar = ({ usr, size = 'default' }) => {
    const [imgError, setImgError] = useState(false);
    const avatarUrl = usr?.avatarUrl;

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

    if (avatarUrl && !imgError) {
      return (
        <img
          src={getFullUrl(avatarUrl)}
          alt=""
          className={`avatar-img ${size}`}
          onError={() => setImgError(true)}
        />
      );
    }

    return (
      <div className={`avatar ${size}`}>
        {initial}
      </div>
    );
  };

  const renderUsernameWithBadge = (username, isVerified) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {username}
      {(isVerified || username === 'MilkyVIP') && <BadgeCheck size={16} color="#3b82f6" title="Оригинал" />}
    </span>
  );

  return (
    <div className="messenger-layout fade-in">
      {/* Левая панель */}
      <div className={`chat-sidebar ${showSidebarOnMobile ? 'mobile-visible' : 'mobile-hidden'}`}>
        <div className="sidebar-header">
          <div className="current-user-info" onClick={() => setShowSettingsModal(true)} style={{cursor: 'pointer'}}>
            <UserAvatar usr={user} />
            <span style={{fontWeight: 600}} className={user.username === 'MilkyVIP' ? 'milky-vip-name' : ''}>
              {renderUsernameWithBadge(user.username, user.isVerified)}
            </span>
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
                  <div className="chat-item-info"><div className="chat-item-name">{renderUsernameWithBadge(foundUser.username, foundUser.isVerified)}</div></div>
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
                <div className="chat-call-actions">
                  <button className="btn-icon call" onClick={() => callUser(getPartner(currentChat).id, false, user.username)}><Phone size={20} /></button>
                  <button className="btn-icon call" onClick={() => callUser(getPartner(currentChat).id, true, user.username)}><Video size={20} /></button>
                </div>
              )}
            </div>

            <div className="messages-area">
              {messages.map((msg) => {
                const actualSenderId = typeof msg.senderId === 'object' ? (msg.senderId.id || msg.senderId._id) : msg.senderId;
                const isOwn = actualSenderId === user.id;
                
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
                          {msg.text ? (
                            <div className="message-text" style={{ textDecoration: 'line-through', opacity: 0.9 }}>{msg.text}</div>
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

                return (
                  <div key={msg.id || Math.random()} className={`message-wrapper ${isOwn ? 'own' : 'other'} slide-up`} onContextMenu={(e) => handleContextMenu(e, msg)}>
                    <div className="message-bubble">
                      {sender && <div className="message-sender-name" onClick={() => setShowUserProfile(sender)} style={{cursor: 'pointer'}}>{renderUsernameWithBadge(sender.username, sender.isVerified)}</div>}
                      {msg.attachments?.map((att, i) => <div key={i}>{renderAttachment(att)}</div>)}
                      {msg.text && <div className="message-text">{msg.text}</div>}
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
                      {isAuthor && (
                        <div className="context-item" onClick={handleEditClick} style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <Edit2 size={16} /> Редактировать
                        </div>
                      )}
                      <div className="context-item delete" onClick={handleDeleteClick} style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        <Trash2 size={16} /> Удалить у всех
                      </div>
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

              {isRecording ? (
                <div className="recording-ui">
                  <div className="recording-indicator"></div>
                  <div className="recording-time">{formatRecordingTime(recordingTime)}</div>
                  <button className="btn-trash" onClick={cancelRecording}><Trash size={20} /></button>
                  <button className="btn-send" onClick={stopRecordingAndSend}><Send size={20} /></button>
                </div>
              ) : (
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
              )}
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

      {/* Group Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Создать группу</h3>
            <input type="text" className="form-control" placeholder="Название группы" value={groupName} onChange={(e) => setGroupName(e.target.value)}/>
            <div className="group-users-list">
              <h4>Выберите участников (поиск из контактов)</h4>
              <input type="text" className="form-control" placeholder="Поиск..." onChange={(e) => setSearchQuery(e.target.value)}/>
              <div className="group-search-results">
                {searchResults.map(u => (
                  <label key={u.id} className="group-user-item">
                    <input type="checkbox" checked={selectedGroupUsers.includes(u.id)} onChange={() => handleToggleGroupUser(u.id)}/>
                    {renderUsernameWithBadge(u.username, u.isVerified)}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={handleCreateGroup} disabled={!groupName || selectedGroupUsers.length === 0}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра чужого профиля */}
      {showUserProfile && (
        <div className="modal-overlay" onClick={() => setShowUserProfile(null)}>
          <div className="modal-content profile-modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Профиль пользователя</h2>
              <button className="btn-icon" onClick={() => setShowUserProfile(null)}><X size={20} /></button>
            </div>
            
            <div className="profile-view-details">
              <div className="profile-view-avatar-container">
                <UserAvatar usr={showUserProfile} size="large" />
              </div>
              <h3 className="profile-view-username" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '15px' }}>
                {showUserProfile.username}
                {showUserProfile.isVerified && <BadgeCheck size={20} color="#3b82f6" />}
              </h3>
              
              <div className={`status-indicator ${showUserProfile.status === 'online' ? 'online' : 'offline'}`} style={{ textAlign: 'center', marginBottom: '20px' }}>
                {showUserProfile.status === 'online' ? '🟢 В сети' : '⚪ Не в сети'}
              </div>

              <div className="profile-view-info-box" style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>О себе:</h4>
                <p style={{ margin: 0, fontSize: '1rem', fontStyle: showUserProfile.bio ? 'normal' : 'italic', color: showUserProfile.bio ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {showUserProfile.bio || 'Информация не указана'}
                </p>
              </div>
              
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => {
                  handleStartChat(showUserProfile.id || showUserProfile._id);
                  setShowUserProfile(null);
                }}>
                  Написать сообщение
                </button>
              </div>
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
                <button className={`btn ${newStoryType === 'image' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setNewStoryType('image')}>
                  <Image size={16} /> Фото
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
                  <div className="form-group">
                    <label>Ссылка на фото</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://example.com/image.jpg"
                      value={newStoryMediaUrl}
                      onChange={e => setNewStoryMediaUrl(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Подпись</label>
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
                    <div style={{ textAlign: 'center' }}>
                      <img src={currentStory.mediaUrl} alt="story" className="story-media-img" />
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
    </div>
  );
};
export default Chat;
