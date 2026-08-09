require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pushModule = require('./routes/pushRoutes');
const storyRoutes = require('./routes/storyRoutes');
const coinRoutes = require('./routes/coinRoutes');
const initSocket = require('./socket');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || '';
const CLIENT_URL = process.env.CLIENT_URL || '*';
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS — принимает любой домен (нужно для GitHub Pages)
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

// Инициализация сокетов
initSocket(io);
app.set('io', io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API роуты
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/push', pushModule.router);
app.use('/api/stories', storyRoutes);
app.use('/api/coins', coinRoutes);

// В продакшене раздаём собранный фронтенд
if (NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuildPath));

  // Все не-API запросы отдают index.html (для React Router)
  app.use((req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API сервер WoW Messenger работает (dev mode)');
  });
}

// Подключение к MongoDB и запуск сервера
const startServer = async () => {
  try {
    let mongoUri = MONGO_URI;
    
    // Если MONGO_URI не задан или указывает на localhost — используем in-memory для демо
    if (!mongoUri || mongoUri.includes('localhost')) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log('⚡ База данных MongoDB запущена в оперативной памяти (Демо-режим)');
      console.log('⚠️  Данные будут потеряны при перезагрузке сервера!');
    }

    await mongoose.connect(mongoUri);
    console.log('📦 База данных успешно подключена');
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
  }
};

// Запускаем сервер СРАЗУ ЖЕ, чтобы Render не выдал ошибку Port scan timeout
server.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT} (${NODE_ENV})`);
  if (NODE_ENV === 'production') {
    console.log('🌐 Фронтенд раздаётся из /client/dist');
  }
});

startServer();
