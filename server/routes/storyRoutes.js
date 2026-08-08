const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createStory,
  getFeedStories,
  getUserStories,
  viewStory,
  deleteStory
} = require('../controllers/storyController');

router.use(authMiddleware);

router.post('/', createStory);
router.get('/feed', getFeedStories);
router.get('/user/:userId', getUserStories);
router.post('/:storyId/view', viewStory);
router.delete('/:storyId', deleteStory);

module.exports = router;
