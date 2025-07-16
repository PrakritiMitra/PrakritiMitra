const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const { registerForEvent, checkRegistration } = require("../controllers/registrationController");

// POST /api/registrations
router.post("/", protect, registerForEvent);
// GET /api/registrations/:eventId/check
router.get("/:eventId/check", protect, checkRegistration);

module.exports = router;
