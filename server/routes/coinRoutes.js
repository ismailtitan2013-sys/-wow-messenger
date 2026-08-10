const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
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
  sendGiftOrCoins
} = require('../controllers/coinController');

router.get('/store', authMiddleware, getStoreCatalog);
router.get('/leaderboard', authMiddleware, getLeaderboard);
router.post('/claim-daily', authMiddleware, claimDailyBonus);
router.post('/claim-combo', authMiddleware, claimDailyCombo);
router.post('/tap', authMiddleware, tapCoins);
router.post('/upgrade-clicker', authMiddleware, upgradeClicker);
router.post('/buy-business', authMiddleware, buyBusiness);
router.post('/buy-boost', authMiddleware, buyBoost);
router.post('/buy-nft', authMiddleware, buyNft);
router.post('/buy', authMiddleware, buyItem);
router.post('/equip', authMiddleware, equipItem);
router.post('/send-gift', authMiddleware, sendGiftOrCoins);

module.exports = router;
