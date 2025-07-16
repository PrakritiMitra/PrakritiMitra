//backend/routes/eventRoutes.js
const protect = require('../middlewares/authMiddleware');
const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, getEventsByOrganization, getUpcomingEvents, getEventById, updateEvent, deleteEvent } = require('../controllers/eventController');
const upload = require('../middlewares/upload');
const Event = require("../models/event");

// @route   POST /api/events/create
router.post( '/create', protect, upload.fields([{ name: 'eventImages', maxCount: 5 }, { name: 'govtApprovalLetter', maxCount: 1 },]), createEvent);

// @route   GET /api/events
router.get('/', getAllEvents);

// @route   GET /api/events/my-events
router.get('/my-events', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const events = await require('../models/event').find({ createdBy: userId })
      .sort({ startDateTime: -1 })
      .populate('organization');
    res.status(200).json(events);
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
router.put('/:id', protect, upload.fields([{ name: 'eventImages', maxCount: 5 }, { name: 'govtApprovalLetter', maxCount: 1 },]), updateEvent);
router.delete('/:id', protect, deleteEvent);

// @route   GET /api/events/organization/:orgId
router.get('/organization/:orgId', getEventsByOrganization);

// @route   GET /api/events/upcoming
router.get('/upcoming', getUpcomingEvents);

module.exports = router;
