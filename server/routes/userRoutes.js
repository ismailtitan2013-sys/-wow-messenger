const express = require('express');
const { searchUsers, updateProfile } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Поиск пользователей
router.get('/search', searchUsers);
router.put('/profile', updateProfile);

module.exports = router;
