// backend/models/organization.js

const mongoose = require('mongoose');

// ✅ Team Member Subschema with timestamps
const TeamMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  position: String,
  isAdmin: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true }); // adds createdAt and updatedAt for each team member

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  logoUrl: String,
  website: String,
  socialLinks: [String], // Array of URLs (LinkedIn, Instagram, etc.)

  documents: {
    gstCertificateUrl: String,
    panCardUrl: String,
    ngoRegistrationUrl: String,
    letterOfIntentUrl: String,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  verifiedStatus: {
    type: String,
    enum: ['pending', 'blueApplicant', 'blueVerified', 'blueChampion'],
    default: 'pending',
  },

  // ✅ Organizers who joined or requested to join
  team: [TeamMemberSchema], // uses subschema with timestamps

  sponsors: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],

  volunteerImpact: {
    totalEvents: {
      type: Number,
      default: 0,
    },
    totalWasteCollectedKg: {
      type: Number,
      default: 0,
    },
    totalVolunteers: {
      type: Number,
      default: 0,
    }
  }

}, { timestamps: true }); // adds createdAt and updatedAt to the org itself

module.exports = mongoose.model('Organization', organizationSchema);
