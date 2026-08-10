const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getStoreCatalog,
  claimDailyBonus,
  tapCoins,
  upgradeClicker,
  buyBusiness,
  claimAchievement,
  claimJob,
  buyItem,
  equipItem,
  sendGiftOrCoins
} = require('../controllers/coinController');

router.get('/store', authMiddleware, getStoreCatalog);
router.post('/claim-daily', authMiddleware, claimDailyBonus);
router.post('/tap', authMiddleware, tapCoins);
router.post('/upgrade-clicker', authMiddleware, upgradeClicker);
router.post('/buy-business', authMiddleware, buyBusiness);
router.post('/claim-achievement', authMiddleware, claimAchievement);
router.post('/claim-job', authMiddleware, claimJob);
router.post('/buy', authMiddleware, buyItem);
router.post('/equip', authMiddleware, equipItem);
router.post('/send-gift', authMiddleware, sendGiftOrCoins);

module.exports = router;
