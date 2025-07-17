const express = require("express");
const router = express.Router();
const {protect} = require("../middlewares/authMiddleware");
const { registerForEvent, checkRegistration, withdrawRegistration, getMyRegisteredEvents } = require("../controllers/registrationController");

// POST /api/registrations
router.post("/", protect, registerForEvent);
// GET /api/registrations/:eventId/check
router.get("/:eventId/check", protect, checkRegistration);
// DELETE /api/registrations/:eventId
router.delete("/:eventId", protect, withdrawRegistration);
// GET /api/registrations/my-events
router.get("/my-events", protect, getMyRegisteredEvents);
// GET /api/registrations/event/:eventId/volunteers - get all volunteers registered for an event
router.get('/event/:eventId/volunteers', require('../controllers/registrationController').getVolunteersForEvent);
// GET /api/registrations/volunteer/:volunteerId/events - get all events a volunteer is registered for
router.get('/volunteer/:volunteerId/events', require('../controllers/registrationController').getEventsForVolunteer);
// GET /api/registrations/volunteer/:volunteerId - get all registrations for a volunteer
router.get('/volunteer/:volunteerId', require('../controllers/registrationController').getRegistrationsForVolunteer);

module.exports = router;
