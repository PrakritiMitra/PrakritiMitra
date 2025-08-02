const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema({
  // Reference to existing user
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Sponsor type (business or individual)
  sponsorType: {
    type: String,
    enum: ['business', 'individual'],
    required: true
  },

  // Business sponsor details
  business: {
    name: String,
    industry: String,
    website: String,
    logo: String, // file path
    description: String,
    yearEstablished: Number,
    employeeCount: String, // "1-10", "11-50", "51-200", "200+"
    documents: {
      gstCertificate: String, // file path
      panCard: String, // file path
      companyRegistration: String // file path
    }
  },

  // Individual sponsor details
  individual: {
    profession: String,
    organization: String, // where they work
    designation: String,
    description: String
  },

  // Common contact details
  contactPerson: {
    type: String,
    required: true
  },
  
  email: {
    type: String,
    required: true
  },
  
  phone: {
    type: String,
    required: true
  },

  // Location
  location: {
    city: String,
    state: String,
    country: {
      type: String,
      default: 'India'
    }
  },

  // Social media links
  socialLinks: {
    linkedin: String,
    instagram: String,
    twitter: String,
    facebook: String,
    website: String
  },

  // Sponsorship preferences
  preferences: {
    focusAreas: [String], // ['environmental', 'education', 'health', 'community']
    preferredContributionType: [String], // ['monetary', 'goods', 'service', 'media']
    preferredOrganizations: [String], // organization names or types
    notes: String
  },

  // Verification status
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },

  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  verifiedAt: Date,

  // Sponsor statistics (calculated from actual sponsorships)
  stats: {
    totalSponsorships: {
      type: Number,
      default: 0
    },
    totalContribution: {
      type: Number,
      default: 0
    },
    maxContribution: {
      type: Number,
      default: 0
    },
    eventsSupported: {
      type: Number,
      default: 0
    },
    organizationsSupported: {
      type: Number,
      default: 0
    },
    currentTier: {
      type: String,
      enum: ['platinum', 'gold', 'silver', 'community'],
      default: 'community'
    },
    tierCalculatedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }

}, { 
  timestamps: true 
});

// Indexes for better query performance
sponsorSchema.index({ user: 1 });
sponsorSchema.index({ 'business.name': 1 });
sponsorSchema.index({ 'preferences.focusAreas': 1 });
sponsorSchema.index({ verificationStatus: 1 });
sponsorSchema.index({ status: 1 });

module.exports = mongoose.model('Sponsor', sponsorSchema); 