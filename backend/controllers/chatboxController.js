const Message = require('../models/Message');

// GET /api/events/:eventId/messages - Fetch chat history for an event
exports.getMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;
    const before = req.query.before; // messageId

    let query = { eventId };
    if (before) {
      // Find the message to get its createdAt
      const beforeMsg = await Message.findById(before);
      if (beforeMsg) {
        query.createdAt = { $lt: beforeMsg.createdAt };
      }
    }

    // Always sort by newest first, then reverse on frontend if needed
    let messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .populate('userId', 'name username profileImage role')
      .populate({
        path: 'replyTo',
        select: 'message userId',
        populate: { path: 'userId', select: 'name username profileImage role' }
      });

    // Reverse to oldest-to-newest for display
    messages = messages.reverse();
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    res.status(500).json({ message: 'Server error fetching messages.' });
  }
};

// POST /api/chatbox/upload - Upload a file for chat
exports.uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  res.json({
    fileUrl: `/uploads/Chat/${req.file.filename}`,
    fileType: req.file.mimetype
  });
};

// PATCH /api/chatbox/messages/:messageId/pin - Pin or unpin a message
exports.pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { eventId } = req.body; // Passed from frontend to scope the update
    const { userId, role } = req.user; // Assuming user is populated from auth middleware

    if (role !== 'organizer') {
      return res.status(403).json({ message: 'Only organizers can pin messages.' });
    }

    const messageToPin = await Message.findById(messageId);

    if (!messageToPin || messageToPin.eventId.toString() !== eventId) {
      return res.status(404).json({ message: 'Message not found in this event.' });
    }

    const newPinStatus = !messageToPin.isPinned;

    // If we are pinning a NEW message, first unpin any existing pinned message for this event.
    if (newPinStatus) {
      await Message.updateMany(
        { eventId: eventId, isPinned: true },
        { $set: { isPinned: false } }
      );
    }

    // Now, set the pin status for the target message
    messageToPin.isPinned = newPinStatus;
    await messageToPin.save();

    const populatedMessage = await Message.findById(messageToPin._id).populate('userId', 'name username profileImage role');

    res.json(populatedMessage);

  } catch (err) {
    console.error("Failed to pin message:", err);
    res.status(500).json({ message: 'Server error pinning message.' });
  }
}; 