//backend/routes/eventRoutes.js
const protect = require('../middlewares/authMiddleware'); // ✅ Add this
const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, getEventsByOrganization, getUpcomingEvents} = require('../controllers/eventController');
const upload = require('../middlewares/upload');

// @route   POST /api/events/create
router.post( '/create', protect, upload.fields([
    { name: 'eventImages', maxCount: 5 },
    { name: 'govtApprovalLetter', maxCount: 1 },
  ]), createEvent
);

// @route   GET /api/events
router.get('/', getAllEvents);

// @route   GET /api/events/organization/:orgId
router.get('/organization/:orgId', getEventsByOrganization);

// @route   GET /api/events/upcoming
router.get('/upcoming', getUpcomingEvents);


module.exports = router;
