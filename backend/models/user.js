// backend/models/user.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Soft deletion fields
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  originalEmail: {
    type: String,
    index: true,
    sparse: true,
    select: false
  },
  // Enhanced deletion tracking
  deletionId: {
    type: String,
    index: true,
    sparse: true
  },
  deletionSequence: {
    type: Number,
    default: 1 // 1st, 2nd, 3rd deletion, etc.
  },
  previousDeletionIds: [{
    type: String
  }],
  recoveryToken: {
    type: String,
    select: false
  },
  recoveryTokenExpires: {
    type: Date,
    select: false
  },

  // Password reset fields
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },

  // Store original authentication method for recovery
  originalAuthMethod: {
    type: String,
    enum: ['oauth', 'password'],
    select: false
  },
  originalOAuthProvider: {
    type: String,
    enum: ['google', 'facebook', 'github'],
    select: false
  },
  originalOAuthId: {
    type: String,
    select: false
  },

  // Common fields
  name: {
    type: String,
    required: true,
  },

  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/, // Only letters, numbers, and underscores
    lowercase: true, // Store usernames in lowercase for consistency
  },

  email: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: function() {
      // Password is required only if not using OAuth
      return !this.oauthProvider;
    },
  },

  // OAuth fields
  oauthProvider: {
    type: String,
    enum: ['google', 'facebook', 'github', null],
    default: null,
  },

  oauthId: {
    type: String,
    sparse: true, // Allows multiple nulls but unique for non-null values
  },

  oauthPicture: {
    type: String, // URL from OAuth provider
  },

  role: {
    type: String,
    enum: ['volunteer', 'organizer'],
    required: true,
  },

  dateOfBirth: {
    type: Date,
    required: function() {
      // Date of birth is optional for OAuth users
      return !this.oauthProvider;
    }
  },

  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    required: function() {
      // Gender is optional for OAuth users
      return !this.oauthProvider;
    }
  },

  city: {
    type: String,
  },

  profileImage: {
    type: String, // stores filename (e.g., "1720775600000-avatar.png")
  },

  isEmailVerified: {
    type: Boolean,
    default: function() {
      // Auto-verify email if using OAuth
      return this.oauthProvider ? true : false;
    },
  },

  isPhoneVerified: {
    type: Boolean,
    default: false,
  },

  // Volunteer-specific
  interests: {
    type: [String],
    default: [],
  },

  location: {
    type: String,
  },

  // Organizer-specific
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },

  position: {
    type: String,
  },

  pendingApproval: {
    type: Boolean,
    default: true,
  },

  govtIdProofUrl: {
    type: String,
  },

  // Additional fields for profile
  emergencyPhone: {
    type: String,
  },

  socials: {
    instagram: { type: String },
    linkedin: { type: String },
    twitter: { type: String },
    facebook: { type: String },
  },

  aboutMe: {
    type: String,
    default: "",
  },

  certificates: [
    {
      event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
      award: { type: String },
      certId: { type: String },
      filePath: { type: String },
      issuedAt: { type: Date },
      verificationUrl: { type: String },
      eventName: { type: String },
      eventDate: { type: String },
    }
  ],

  // Sponsor capabilities (for existing users who want to become sponsors)
  sponsor: {
    isSponsor: {
      type: Boolean,
      default: false
    },
    sponsorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sponsor'
    },
    upgradeRequestedAt: Date,
    upgradeApprovedAt: Date
  },

  // Track sponsorship history for users who are sponsors
  sponsoredEvents: [{
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    sponsorship: { type: mongoose.Schema.Types.ObjectId, ref: 'Sponsorship' },
    contribution: { type: String },
    tier: String,
    date: Date
  }],

}, { timestamps: true });

// Create a partial compound index for OAuth provider and ID
// This index is only applied when oauthProvider exists
userSchema.index(
  { oauthProvider: 1, oauthId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { 
      oauthProvider: { $exists: true },
      oauthId: { $exists: true }
    } 
  }
);

// Pre-save hook to handle OAuth fields and soft deletion
userSchema.pre('save', function(next) {
  // If this is not an OAuth user, ensure oauth fields are undefined
  if (!this.oauthProvider) {
    this.oauthProvider = undefined;
    this.oauthId = undefined;
  }
  
  // Handle email hashing for soft-deleted accounts
  if (this.isModified('isDeleted') && this.isDeleted) {
    this.deletedAt = new Date();
    
    // Only hash email if it's not already hashed
    if (this.email && !this.email.startsWith('deleted_')) {
      this.originalEmail = this.email;
      // Simple hash for email - we'll use a better hash in the controller
      this.email = `deleted_${Date.now()}_${this._id}@deleted.prakritimitra.invalid`;
    }
  }
  
  next();
});

// Add a static method to find active users
userSchema.statics.findActive = function(conditions = {}) {
  return this.find({ ...conditions, isDeleted: { $ne: true } });
};

// Add a static method to find deleted users
userSchema.statics.findDeleted = function(conditions = {}) {
  return this.find({ ...conditions, isDeleted: true });
};

// Post-save hook for better error logging
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    console.error('💥 Duplicate key error on save:', {
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      doc: {
        _id: doc?._id,
        email: doc?.email,
        oauthProvider: doc?.oauthProvider,
        oauthId: doc?.oauthId
      }
    });
  }
  next(error);
});

module.exports = mongoose.model('User', userSchema);
