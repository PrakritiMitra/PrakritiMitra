const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true // Add index for faster queries
  },
  // Reference to user (can be null if user is deleted)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make optional for deleted users
  },
  // Denormalized user info at time of message creation
  userInfo: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    avatar: String,
    role: String
  },
  // Indicates if the user who sent this message is deleted
  isUserDeleted: {
    type: Boolean,
    default: false
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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    // Denormalized user info for reactions
    userInfo: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      avatar: String
    }
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
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save hook to populate userInfo
messageSchema.pre('save', async function(next) {
  try {
    // Only populate userInfo if it's a new message or user is not already set
    if (this.isNew && this.userId && !this.userInfo) {
      const User = mongoose.model('User');
      const user = await User.findById(this.userId).select('name profileImage role');
      
      if (user) {
        this.userInfo = {
          userId: user._id,
          name: user.name,
          avatar: user.profileImage,
          role: user.role
        };
      }
    }
    
    // If userId is being removed, mark as deleted
    if (this.isModified('userId') && !this.userId) {
      this.isUserDeleted = true;
    }
    
    // Ensure userInfo is always populated for consistency
    if (this.userId && !this.userInfo) {
      const User = mongoose.model('User');
      const user = await User.findById(this.userId).select('name profileImage role');
      
      if (user) {
        this.userInfo = {
          userId: user._id,
          name: user.name,
          avatar: user.profileImage,
          role: user.role
        };
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to handle user deletion
messageSchema.statics.handleUserDeletion = async function(userId) {
  // Update all messages from this user
  await this.updateMany(
    { 'userInfo.userId': userId },
    { 
      $set: { isUserDeleted: true },
      $unset: { userId: 1 }
    }
  );
  
  // Update reactions from this user
  await this.updateMany(
    { 'reactions.userInfo.userId': userId },
    { 
      $pull: { 
        reactions: { 'userInfo.userId': userId } 
      } 
    }
  );
};

module.exports = mongoose.model('Message', messageSchema);