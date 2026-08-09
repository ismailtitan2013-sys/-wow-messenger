const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const { sendPushNotification } = require('./routes/pushRoutes');

const connectedUsers = new Map();

const initSocket = (io) => {
  // Промежуточное ПО для проверки JWT токена при подключении сокета
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_default_key');
      socket.user = decoded; // Сохраняем данные юзера в объекте сокета
      connectedUsers.set(decoded.id, socket.id);
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`📡 Пользователь ${socket.user.id} подключился через сокет`);
    
    // Устанавливаем статус 'online' в БД
    try {
      await require('./models/User').findByIdAndUpdate(socket.user.id, { status: 'online' });
    } catch (e) {
      console.error('Ошибка обновления статуса online', e);
    }

    // Пользователь присоединяется к своей персональной "комнате", чтобы получать уведомления
    socket.join(socket.user.id);

    // Подключение к комнате конкретного чата
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`Пользователь ${socket.user.id} вошел в чат ${chatId}`);
    });

    // Отправка сообщения
    socket.on('send_message', async (data) => {
      const { chatId, text, receiverId, attachments } = data;
      
      try {
        const messageText = text || data.content || '';
        const newMessage = new Message({
          chatId,
          senderId: socket.user.id,
          text: messageText,
          content: messageText,
          attachments: attachments || [],
          status: 'sent'
        });
        const savedMessage = await newMessage.save();

        // Обновляем последнее сообщение в чате
        const chat = await Chat.findByIdAndUpdate(chatId, { lastMessage: savedMessage._id }, { new: true });

        const populatedMessage = await Message.findById(savedMessage._id)
          .populate('senderId', 'username avatarUrl avatarFrame nameColor badges status role');

        const messageData = populatedMessage.toJSON();

        // Отправляем сообщение в комнату чата
        io.to(chatId).emit('receive_message', messageData);

        // Отправляем сообщение всем участникам чата персонально
        chat.participants.forEach(async (participantId) => {
          const socketId = connectedUsers.get(participantId.toString());
          if (socketId) {
            io.to(socketId).emit('receive_message', messageData);
          } else if (participantId.toString() !== socket.user.id) {
            // Check if user allows push
            const pUser = await require('./models/User').findById(participantId);
            if (pUser && (!pUser.settings || pUser.settings.allowPushNotifications !== false)) {
              let pushText = text;
              if (attachments && attachments.length > 0) {
                pushText = attachments[0].type === 'audio' ? '🎤 Голосовое сообщение' : '📎 Вложение';
              }
              sendPushNotification(participantId.toString(), {
                title: `Новое сообщение`,
                body: pushText,
                icon: messageData.senderId.avatarUrl || '/favicon.svg',
                chatId: chat._id
              });
            }
          }
        });

        // Если есть конкретный получатель (для личных чатов), уведомляем его
        if (receiverId) {
          socket.to(receiverId).emit('new_message_notification', populatedMessage);
        }
      } catch (error) {
        console.error('Ошибка при сохранении/отправке сообщения:', error);
      }
    });

    // Редактирование сообщения
    socket.on('edit_message', async (data) => {
      const { messageId, chatId, newText } = data;
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        
        // Строгая проверка: редактировать может только автор
        if (message.senderId.toString() !== socket.user.id) return;

        message.text = newText;
        message.isEdited = true;
        await message.save();

        io.to(chatId).emit('message_edited', message);
      } catch (error) {
        console.error('Ошибка редактирования сообщения:', error);
      }
    });

    // Удаление сообщения (для всех)
    socket.on('delete_message', async (data) => {
      const { messageId, chatId } = data;
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // Удалять может автор или администратор
        const isMilkyOrAdmin = socket.user.role === 'admin' || socket.user.username === 'MilkyVIP';
        if (message.senderId.toString() !== socket.user.id && !isMilkyOrAdmin) return;

        message.deletedForEveryone = true;
        // Текст сообщения сохраняется для истории админов/MilkyVIP
        await message.save();

        io.to(chatId).emit('message_deleted', message);
      } catch (error) {
        console.error('Ошибка удаления сообщения:', error);
      }
    });

    // Отметка о прочтении
    socket.on('mark_as_read', async (chatId) => {
      try {
        const currentUser = await require('./models/User').findById(socket.user.id);
        if (currentUser && currentUser.settings && currentUser.settings.readReceipts === false) {
          // Читаем без уведомления отправителя
          return;
        }

        // Обновляем статус всех сообщений в чате, которые отправлены НЕ нами и еще не прочитаны
        await Message.updateMany(
          { chatId, senderId: { $ne: socket.user.id }, status: { $ne: 'read' } },
          { $set: { status: 'read', isRead: true } }
        );

        // Уведомляем собеседников в комнате, что сообщения прочитаны
        socket.to(chatId).emit('messages_read', { chatId, readBy: socket.user.id });
      } catch (error) {
        console.error('Ошибка при обновлении статуса прочтения:', error);
      }
    });

    // Индикация набора текста
    socket.on('typing', (data) => {
      const { chatId, isTyping } = data;
      // Отправляем событие всем в комнате, КРОМЕ самого отправителя
      socket.to(chatId).emit('typing', { chatId, senderId: socket.user.id, isTyping });
    });

    // Реакции на сообщения
    socket.on('add_reaction', async (data) => {
      try {
        const { messageId, chatId, emoji } = data;
        
        // Находим сообщение
        const message = await Message.findById(messageId);
        if (message) {
          // Проверяем, ставил ли этот пользователь уже такую же реакцию
          const existingReactionIndex = message.reactions.findIndex(r => r.userId.toString() === socket.user.id.toString() && r.emoji === emoji);
          
          if (existingReactionIndex !== -1) {
            // Если ставил, то удаляем её (тоггл)
            message.reactions.splice(existingReactionIndex, 1);
          } else {
            // Добавляем новую реакцию
            message.reactions.push({ emoji, userId: socket.user.id });
          }
          
          await message.save();
          
          // Отправляем всем в комнате (включая отправителя) обновленные реакции
          io.to(chatId).emit('message_reaction', { messageId, reactions: message.reactions });
        }
      } catch (error) {
        console.error('Ошибка при добавлении реакции:', error);
      }
    });

    // --- WebRTC Signaling --- //

    // 1. Инициация звонка (отправка offer)
    socket.on('call_user', (data) => {
      const { userToCall, signalData, from, name, isVideo } = data;
      // Отправляем собеседнику сигнал о входящем звонке
      io.to(userToCall).emit('call_incoming', {
        signal: signalData,
        from, // ID звонящего
        name, // Имя звонящего
        isVideo // Тип звонка
      });
    });

    // 2. Ответ на звонок (отправка answer)
    socket.on('answer_call', (data) => {
      const { to, signal } = data;
      io.to(to).emit('call_accepted', signal);
    });

    // 3. Обмен ICE-кандидатами для установки прямого p2p соединения
    socket.on('ice_candidate', (data) => {
      const { to, candidate } = data;
      io.to(to).emit('ice_candidate', { candidate, from: socket.user.id });
    });

    // 4. Отклонение вызова
    socket.on('reject_call', (data) => {
      const { to } = data;
      io.to(to).emit('call_rejected');
    });

    // 5. Завершение вызова
    socket.on('end_call', (data) => {
      const { to } = data;
      io.to(to).emit('call_ended');
    });

    socket.on('disconnect', async () => {
      console.log(`🔴 Пользователь ${socket.user.id} отключился`);
      connectedUsers.delete(socket.user.id);
      
      // Устанавливаем статус 'offline'
      try {
        await require('./models/User').findByIdAndUpdate(socket.user.id, { status: 'offline' });
      } catch (e) {
        console.error('Ошибка обновления статуса offline', e);
      }
    });
  });
};

module.exports = initSocket;
