// backend/models/user.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Common fields
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  phone: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ['volunteer', 'organizer'],
    required: true,
  },

  dateOfBirth: {
    type: Date,
    required: true
  },

  city: {
    type: String,
  },

  profileImage: {
    type: String, // stores filename (e.g., "1720775600000-avatar.png")
  },

  isEmailVerified: {
    type: Boolean,
    default: false,
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

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
