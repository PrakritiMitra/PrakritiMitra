const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true // Add index for faster queries
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  fileUrl: {
    type: String,
  },
  fileType: {
    type: String, // e.g., 'image/jpeg', 'application/pdf'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  reactions: [{
    emoji: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  editCount: {
    type: Number,
    default: 0
  },
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('Message', messageSchema); 