const express = require('express');
const router = express.Router();
const { protect, requireOrganizer } = require('../middlewares/authMiddleware');
const chatboxController = require('../controllers/chatboxController');
const { chatUpload } = require('../middlewares/upload');

// GET /api/chat/events/:eventId/messages
router.get('/events/:eventId/messages', protect, chatboxController.getMessages);

// POST /api/chat/upload
router.post('/upload', protect, chatUpload.single('file'), chatboxController.uploadFile);

// PATCH /api/chat/messages/:messageId/pin
router.patch('/messages/:messageId/pin', protect, requireOrganizer, chatboxController.pinMessage);

module.exports = router; 