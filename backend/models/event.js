const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  description: String,

  location: String, // The original string field remains untouched

  mapLocation: {
    address: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },
  },

  startDateTime: {
    type: Date,
    required: true,
  },

  endDateTime: {
    type: Date,
    required: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },

  eventType: {
    type: String,
  },

  maxVolunteers: {
    type: Number,
    default: 0, // -1 for unlimited
  },

  unlimitedVolunteers: {
    type: Boolean,
    default: false,
  },

  volunteers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],

  eventImages: [
    {
      type: String, // filenames of uploaded images
    },
  ],

  govtApprovalLetter: {
    type: String, // filename of uploaded PDF/image
  },

  instructions: {
    type: String,
  },

  groupRegistration: {
    type: Boolean,
    default: false,
  },

  recurringEvent: {
    type: Boolean,
    default: false,
  },

  recurringType: {
    type: String, // "weekly" or "monthly"
  },

  recurringValue: {
    type: String, // e.g. "Monday" or "1"
  },

  // NEW FIELDS FOR IMPROVED RECURRING EVENTS
  recurringSeriesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringEventSeries',
    default: null,
  },

  recurringInstanceNumber: {
    type: Number,
    default: null, // 1, 2, 3, etc.
  },

  isRecurringInstance: {
    type: Boolean,
    default: false,
  },

  nextRecurringDate: {
    type: Date,
    default: null, // When the next instance should be created
  },

  recurringEndDate: {
    type: Date,
    default: null, // When the series should end
  },

  recurringMaxInstances: {
    type: Number,
    default: null, // Maximum number of instances to create
  },

  recurringStatus: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active',
  },

  equipmentNeeded: {
    type: [String],
    default: [],
  },

  // Extra Questionnaire Fields
  waterProvided: {
    type: Boolean,
    default: false,
  },

  medicalSupport: {
    type: Boolean,
    default: false,
  },

  ageGroup: {
    type: String,
  },

  precautions: {
    type: String,
  },

  publicTransport: {
    type: String,
  },

  contactPerson: {
    type: String,
  },

  // Gamified Questionnaire Completion
  questionnaire: {
    completed: { type: Boolean, default: false },
    answers: { type: Object, default: {} }, // Store answers as an object
    domain: { type: String }, // Optionally store the event domain/type
  },

  organizerTeam: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      hasAttended: { type: Boolean, default: false },
      questionnaire: {
        completed: { type: Boolean, default: false },
        answers: { type: Object, default: {} },
        submittedAt: { type: Date }
      }
    }
  ],

  organizerJoinRequests: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      _wasRejected: { type: Boolean, default: false },
    }
  ],

  summary: {
    type: String,
    default: '',
  },

  report: {
    content: { type: String, default: '' },
    generatedAt: { type: Date },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isGenerated: { type: Boolean, default: false }
  },

  certificates: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['volunteer', 'organizer', 'creator'] }, // NEW
      award: { type: String },
      certId: { type: String },
      filePath: { type: String },
      issuedAt: { type: Date },
      verificationUrl: { type: String },
      name: { type: String },
      profileImage: { type: String }
    }
  ],

  // Volunteer management arrays
  removedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Can re-register
  bannedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],   // Cannot re-register

}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
