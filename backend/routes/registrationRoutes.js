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

module.exports = router;
