const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');
const { chatRateLimit } = require('../middlewares/chatRateLimit');

router.post('/', protect, chatRateLimit, handleChat);

module.exports = router; 