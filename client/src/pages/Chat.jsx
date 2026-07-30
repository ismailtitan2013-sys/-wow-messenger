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
  FileText, Download, MessageSquare, X, Mic, Trash, PhoneOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { requestFCMToken, onForegroundMessage } from '../firebase';

const Chat = () => {
  const { user, token, logout, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const socketRef = useRef();
  
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
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
  
  // Group creation states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

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
    peerConnectionRef
  } = useWebRTC(socketRef, user.id);

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
        setMessages((prev) => {
          if (currentChat && message.chatId === currentChat.id) {
            const msgSenderId = typeof message.senderId === 'object' ? (message.senderId.id || message.senderId._id) : message.senderId;
            if (msgSenderId !== user.id) {
              socketRef.current.emit('mark_as_read', currentChat.id);
            }
            return [...prev, message];
          }
          return prev;
        });
        updateChatListWithNewMessage(message);
      });

      socketRef.current.on('message_edited', (editedMsg) => {
        setMessages((prev) => prev.map(m => m.id === editedMsg.id ? editedMsg : m));
        updateChatListWithNewMessage(editedMsg, true);
      });

      socketRef.current.on('message_deleted', (deletedMsg) => {
        setMessages((prev) => prev.map(m => m.id === deletedMsg.id ? deletedMsg : m));
        updateChatListWithNewMessage(deletedMsg, true);
      });

      socketRef.current.on('messages_read', ({ chatId, readBy }) => {
        if (currentChat && chatId === currentChat.id) {
          setMessages((prev) => prev.map(m => {
            const mSenderId = typeof m.senderId === 'object' ? (m.senderId.id || m.senderId._id) : m.senderId;
            return (mSenderId === user.id && m.status !== 'read') ? { ...m, status: 'read', isRead: true } : m;
          }));
        }
      });

      socketRef.current.on('typing', (data) => {
        if (currentChat && data.chatId === currentChat.id) {
          setPartnerTyping(data.isTyping);
        }
      });

      socketRef.current.on('call_incoming', ({ signal, from, name, isVideo }) => {
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
        setCallState(prev => ({ ...prev, callAccepted: true }));
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        }
      });

      socketRef.current.on('ice_candidate', async ({ candidate }) => {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Ошибка добавления ICE кандидата', e);
          }
        }
      });

      socketRef.current.on('call_rejected', () => {
        toast.error('Абонент отклонил вызов');
        cleanupCall();
      });

      socketRef.current.on('call_ended', () => {
        cleanupCall();
      });
      
      setupPushNotifications();
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token, currentChat]);

  useEffect(() => {
    fetchChats();
  }, []);

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
    if (msg.senderId === user.id && !msg.deletedForEveryone) {
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
      setProfileData({ ...profileData, avatarUrl: res.data.url });
      toast.success('Аватар загружен!', { id: toastId });
    } catch (err) {
      toast.error('Ошибка загрузки аватара', { id: toastId });
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const res = await axios.put('/api/users/profile', profileData);
      setUser(prev => ({ ...prev, ...res.data }));
      
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

  const getPartner = (chat) => chat.isGroup ? null : (chat?.participants?.find(p => p.id !== user.id) || {});
  const getChatName = (chat) => chat.isGroup ? chat.groupName : getPartner(chat).username;
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

  const UserAvatar = ({ usr, size = 'default' }) => (
    usr?.avatarUrl ? (
      <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${usr.avatarUrl}`} alt="avatar" className={`avatar-img ${size}`} />
    ) : (
      <div className={`avatar ${size}`}>{usr?.username?.charAt(0).toUpperCase()}</div>
    )
  );

  const renderUsernameWithBadge = (username) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {username}
      {username === 'MilkyVIP' && <BadgeCheck size={16} color="#3b82f6" title="Оригинал" />}
    </span>
  );

  return (
    <div className="messenger-layout fade-in">
      {/* Левая панель */}
      <div className={`chat-sidebar ${showSidebarOnMobile ? 'mobile-visible' : 'mobile-hidden'}`}>
        <div className="sidebar-header">
          <div className="current-user-info" onClick={() => setShowSettingsModal(true)} style={{cursor: 'pointer'}}>
            <UserAvatar usr={user} />
            <span style={{fontWeight: 600}}>{renderUsernameWithBadge(user.username)}</span>
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

        <div className="chat-list">
          {searchResults.length > 0 ? (
            <div className="search-results">
              <div className="list-title">Результаты поиска</div>
              {searchResults.map(foundUser => (
                <div key={foundUser.id} className="chat-item" onClick={() => handleStartChat(foundUser.id)}>
                  <div className="avatar"><UserAvatar usr={foundUser} /></div>
                  <div className="chat-item-info"><div className="chat-item-name">{renderUsernameWithBadge(foundUser.username)}</div></div>
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
                  <div key={chat.id} className={`chat-item ${currentChat?.id === chat.id ? 'active' : ''}`} onClick={() => {setCurrentChat(chat); setShowSidebarOnMobile(false);}}>
                    <div className="avatar relative">
                      {chat.isGroup ? '👥' : <UserAvatar usr={partner} />}
                      {!chat.isGroup && partner?.status === 'online' && <span className="online-indicator"></span>}
                    </div>
                    <div className="chat-item-info">
                      <div className="chat-item-name">{renderUsernameWithBadge(chatName)}</div>
                      <div className="chat-item-last-msg">
                        {chat.lastMessage?.deletedForEveryone ? <i>Сообщение удалено</i> : (chat.lastMessage?.text || (chat.lastMessage?.attachments?.length ? 'Файл' : 'Нет сообщений'))}
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
              <div className="chat-header-info">
                <button className="btn-icon mobile-only" onClick={() => { setCurrentChat(null); setShowSidebarOnMobile(true); }}><ArrowLeft size={24} /></button>
                <div className="avatar small">{currentChat.isGroup ? <Users size={20} /> : <UserAvatar usr={getPartner(currentChat)} size="small" />}</div>
                <div>
                  <div className="chat-partner-name">{renderUsernameWithBadge(getChatName(currentChat))}</div>
                  <div className="chat-partner-status">
                    {currentChat.isGroup ? `${currentChat.participants.length} участников` : (getPartner(currentChat).status === 'online' ? 'В сети' : 'Был(а) недавно')}
                  </div>
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
                  return (
                    <div key={msg.id} className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
                      <div className="message-bubble deleted"><i>🚫 Сообщение удалено</i></div>
                    </div>
                  );
                }

                const sender = currentChat.isGroup && !isOwn ? currentChat.participants.find(p => p.id === actualSenderId) : null;

                return (
                  <div key={msg.id || Math.random()} className={`message-wrapper ${isOwn ? 'own' : 'other'} slide-up`} onContextMenu={(e) => handleContextMenu(e, msg)}>
                    <div className="message-bubble">
                      {sender && <div className="message-sender-name">{renderUsernameWithBadge(sender.username)}</div>}
                      {msg.attachments?.map((att, i) => <div key={i}>{renderAttachment(att)}</div>)}
                      {msg.text && <div className="message-text">{msg.text}</div>}
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
                <div className="context-item" onClick={handleEditClick} style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <Edit2 size={16} /> Редактировать
                </div>
                <div className="context-item delete" onClick={handleDeleteClick} style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <Trash2 size={16} /> Удалить у всех
                </div>
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
                    {renderUsernameWithBadge(u.username)}
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
            {callState.isVideo && <video playsInline autoPlay muted ref={localVideoRef} className="local-video" />}
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
    </div>
  );
};
export default Chat;
