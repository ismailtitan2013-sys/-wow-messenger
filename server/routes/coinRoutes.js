const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getStoreCatalog,
  buyItem,
  equipItem,
  sendGiftOrCoins
} = require('../controllers/coinController');

router.get('/store', authMiddleware, getStoreCatalog);
router.post('/buy', authMiddleware, buyItem);
router.post('/equip', authMiddleware, equipItem);
router.post('/send-gift', authMiddleware, sendGiftOrCoins);

module.exports = router;
