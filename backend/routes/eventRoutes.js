//backend/routes/eventRoutes.js
const { protect, requireOrganizer } = require('../middlewares/authMiddleware');
const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, getEventsByOrganization, getUpcomingEvents, getEventById, updateEvent, deleteEvent, joinAsOrganizer, getOrganizerTeam, updateOrganizerAttendance, leaveAsOrganizer, requestJoinAsOrganizer, approveJoinRequest, rejectJoinRequest, withdrawJoinRequest, completeQuestionnaire } = require('../controllers/eventController');
const { eventMultiUpload, completedEventUpload } = require('../middlewares/upload');

const Event = require("../models/event");

// @route   POST /api/events/create
router.post( '/create', protect, eventMultiUpload, createEvent);

// @route   GET /api/events
router.get('/', getAllEvents);

// @route   GET /api/events/my-events
router.get('/my-events', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const Event = require('../models/event');
    // Find events where user is creator OR in organizerTeam
    const events = await Event.find({
      $or: [
        { createdBy: userId },
        { 'organizerTeam.user': userId }
      ]
    })
      .sort({ startDateTime: -1 })
      .populate('organization');
    // Remove duplicates (if any)
    const uniqueEvents = [];
    const seen = new Set();
    for (const event of events) {
      if (!seen.has(event._id.toString())) {
        uniqueEvents.push(event);
        seen.add(event._id.toString());
      }
    }
    res.status(200).json(uniqueEvents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/events/all-events
router.get('/all-events', protect, async (req, res) => {
  try {
    const events = await require('../models/event').find({})
      .sort({ startDateTime: -1 })
      .populate('organization');
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events/batch - get details for multiple events by IDs
router.post("/batch", protect, async (req, res) => {
  try {
    const { eventIds } = req.body;
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.json([]);
    }
    const events = await Event.find({ _id: { $in: eventIds } }).populate('organization');
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get event by ID /api/events/:id
router.get('/:id', getEventById);
router.put('/:id', protect, eventMultiUpload, updateEvent);
router.delete('/:id', protect, deleteEvent);

// Complete questionnaire for an event
router.post('/:id/complete-questionnaire', protect, requireOrganizer, completedEventUpload.array('media', 10), completeQuestionnaire);

// @route   GET /api/events/organization/:orgId
router.get('/organization/:orgId', getEventsByOrganization);

// @route   GET /api/events/upcoming
router.get('/upcoming', getUpcomingEvents);

// @route   GET /api/events/created-by/:userId
router.get('/created-by/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const events = await require('../models/event').find({ createdBy: userId })
      .sort({ startDateTime: -1 })
      .populate('organization');
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/events/by-organizer-and-org/:userId/:orgId
router.get('/by-organizer-and-org/:userId/:orgId', async (req, res) => {
  try {
    const { userId, orgId } = req.params;
    const events = await require('../models/event').find({
      createdBy: userId,
      organization: orgId
    }).sort({ startDateTime: -1 }).populate('organization');
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Organizer joins an event as a team member
router.post('/:eventId/join-organizer', protect, requireOrganizer, joinAsOrganizer);

// Organizer leaves an event as organizer
router.post('/:eventId/leave-organizer', protect, requireOrganizer, leaveAsOrganizer);

// Organizer requests to join as organizer
router.post('/:eventId/request-join-organizer', protect, requireOrganizer, requestJoinAsOrganizer);
// Creator approves a join request
router.post('/:eventId/approve-join-request', protect, approveJoinRequest);
// Creator rejects a join request
router.post('/:eventId/reject-join-request', protect, rejectJoinRequest);

// Organizer withdraws join request
router.post('/:eventId/withdraw-join-request', protect, requireOrganizer, withdrawJoinRequest);

// Get the organizer team for an event
router.get('/:eventId/organizer-team', protect, getOrganizerTeam);

// PATCH /api/events/:eventId/organizer/:organizerId/attendance - mark attendance for an organizer
router.patch('/:eventId/organizer/:organizerId/attendance', protect, requireOrganizer, updateOrganizerAttendance);

module.exports = router;
