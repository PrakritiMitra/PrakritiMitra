//backend/routes/eventRoutes.js
const { protect, requireOrganizer } = require('../middlewares/authMiddleware');
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { eventMultiUpload, completedEventUpload } = require('../middlewares/upload');

const Event = require("../models/event");

// Get event count for statistics
router.get('/count', async (req, res) => {
  try {
    console.log('🔹 Fetching event count...');
    
    const eventCount = await Event.countDocuments();
    
    console.log(`✅ Event count: ${eventCount}`);
    
    res.json({ eventCount });
  } catch (error) {
    console.error('❌ Error getting event count:', error);
    res.status(500).json({ message: 'Failed to get event count' });
  }
});

// @route   POST /api/events/create
router.post( '/create', protect, eventMultiUpload, eventController.createEvent);

// @route   GET /api/events
router.get('/', eventController.getAllEvents);

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
router.get('/:id', eventController.getEventById);
router.put('/:id', protect, eventMultiUpload, eventController.updateEvent);
router.delete('/:id', protect, eventController.deleteEvent);

// Complete questionnaire for an event
router.post('/:id/complete-questionnaire', protect, requireOrganizer, completedEventUpload.array('media', 10), eventController.completeQuestionnaire);

// Handle event completion and create next recurring instance if needed
router.post('/:eventId/complete', protect, eventController.handleEventCompletion);

// @route   GET /api/events/organization/:orgId
router.get('/organization/:orgId', eventController.getEventsByOrganization);

// @route   GET /api/events/upcoming
router.get('/upcoming', eventController.getUpcomingEvents);

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
router.post('/:eventId/join-organizer', protect, requireOrganizer, eventController.joinAsOrganizer);

// Organizer leaves an event as organizer
router.post('/:eventId/leave-organizer', protect, requireOrganizer, eventController.leaveAsOrganizer);

// Organizer requests to join as organizer
router.post('/:eventId/request-join-organizer', protect, requireOrganizer, eventController.requestJoinAsOrganizer);
// Creator approves a join request
router.post('/:eventId/approve-join-request', protect, eventController.approveJoinRequest);
// Creator rejects a join request
router.post('/:eventId/reject-join-request', protect, eventController.rejectJoinRequest);

// Organizer withdraws join request
router.post('/:eventId/withdraw-join-request', protect, requireOrganizer, eventController.withdrawJoinRequest);

// Get the organizer team for an event
router.get('/:eventId/organizer-team', protect, eventController.getOrganizerTeam);

// PATCH /api/events/:eventId/organizer/:organizerId/attendance - mark attendance for an organizer
router.patch('/:eventId/organizer/:organizerId/attendance', protect, requireOrganizer, eventController.updateOrganizerAttendance);

// Get available slots for an event
router.get('/:id/slots', eventController.getEventSlots);

// Generate certificate for a user
router.post('/:eventId/generate-certificate', protect, eventController.generateCertificate);

// Remove volunteer from event (can re-register)
router.post('/:eventId/remove-volunteer', protect, eventController.removeVolunteer);

// Ban volunteer from event (cannot re-register)
router.post('/:eventId/ban-volunteer', protect, eventController.banVolunteer);

// Remove organizer from event (can re-join)
router.post('/:eventId/remove-organizer', protect, eventController.removeOrganizer);

// Ban organizer from event (cannot re-join)
router.post('/:eventId/ban-organizer', protect, eventController.banOrganizer);

// Unban volunteer from event (can re-register)
router.post('/:eventId/unban-volunteer', protect, eventController.unbanVolunteer);

// Unban organizer from event (can re-join)
router.post('/:eventId/unban-organizer', protect, eventController.unbanOrganizer);

module.exports = router;
