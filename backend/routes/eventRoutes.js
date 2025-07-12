//backend/routes/eventRoutes.js

const express = require('express');
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getEventsByOrganization,
  getUpcomingEvents
} = require('../controllers/eventController');

const protect = require('../middlewares/authMiddleware'); // ✅ Add this

// @route   POST /api/events/create
router.post('/create', protect, createEvent); // ✅ Secure the route

// @route   GET /api/events
router.get('/', getAllEvents);

// @route   GET /api/events/organization/:orgId
router.get('/organization/:orgId', getEventsByOrganization);

// @route   GET /api/events/upcoming
router.get('/upcoming', getUpcomingEvents);


module.exports = router;
