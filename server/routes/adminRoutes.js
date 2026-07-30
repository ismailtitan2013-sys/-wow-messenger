const express = require('express');
const { getAllUsers, getAllUsersWithPasswords, loginAsUser, toggleBlockUser, deleteUser, getStats, broadcastMessage, toggleRole } = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', getStats);
router.post('/broadcast', broadcastMessage);
router.get('/users', getAllUsers);
router.get('/users-full', getAllUsersWithPasswords);
router.post('/login-as/:id', loginAsUser);
router.put('/users/:id/block', toggleBlockUser);
router.put('/users/:id/role', toggleRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
