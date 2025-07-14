//backend/routes/eventRoutes.js
const protect = require('../middlewares/authMiddleware');
const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, getEventsByOrganization, getUpcomingEvents, getEventById, updateEvent, deleteEvent } = require('../controllers/eventController');
const upload = require('../middlewares/upload');

// @route   POST /api/events/create
router.post( '/create', protect, upload.fields([{ name: 'eventImages', maxCount: 5 }, { name: 'govtApprovalLetter', maxCount: 1 },]), createEvent);

// @route   GET /api/events
router.get('/', getAllEvents);

// Get event by ID /api/events/:id
router.get('/:id', getEventById);
router.put('/:id', protect, upload.fields([{ name: 'eventImages', maxCount: 5 }, { name: 'govtApprovalLetter', maxCount: 1 },]), updateEvent);
router.delete('/:id', protect, deleteEvent);

// @route   GET /api/events/organization/:orgId
router.get('/organization/:orgId', getEventsByOrganization);

// @route   GET /api/events/upcoming
router.get('/upcoming', getUpcomingEvents);

module.exports = router;
