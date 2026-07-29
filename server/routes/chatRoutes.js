const express = require('express');
const { getUserChats, createOrGetChat, getChatMessages, createGroupChat } = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Все маршруты чатов требуют авторизации
router.use(authMiddleware);

router.get('/', getUserChats);
router.post('/', createOrGetChat);
router.post('/group', createGroupChat);
router.get('/:id/messages', getChatMessages);

module.exports = router;
