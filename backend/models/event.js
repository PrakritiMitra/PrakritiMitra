const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  description: String,

  location: String,

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
  }

}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
