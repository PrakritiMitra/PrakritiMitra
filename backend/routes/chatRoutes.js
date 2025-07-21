const express = require('express');
const router = express.Router();
const { protect, requireOrganizer } = require('../middlewares/authMiddleware');
const chatController = require('../controllers/chatController');
const { chatUpload } = require('../middlewares/upload');

// GET /api/chat/events/:eventId/messages
router.get('/events/:eventId/messages', protect, chatController.getMessages);

// POST /api/chat/upload
router.post('/upload', protect, chatUpload.single('file'), chatController.uploadFile);

// PATCH /api/chat/messages/:messageId/pin
router.patch('/messages/:messageId/pin', protect, requireOrganizer, chatController.pinMessage);

module.exports = router; 