//backend/controllers/eventController.js

const Event = require('../models/event');
const mongoose = require('mongoose');

// Create new event
exports.createEvent = async (req, res) => {
  try {
    console.log("🔹 Create Event Request Body:", req.body);

    const eventData = {
      ...req.body,
      createdBy: req.user._id, // ✅ Add the user creating the event
    };

    const event = new Event(eventData);
    await event.save();

    console.log("✅ Event created:", event.title || event._id);
    res.status(201).json(event);
  } catch (err) {
    console.error("❌ Event creation failed:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const now = new Date();
    console.log("🔹 Fetching upcoming events after:", now);

    const events = await Event.find({ date: { $gte: now } })
      .sort({ date: 1 }) // Optional: sort by soonest first
      .populate("organization");

    console.log(`✅ ${events.length} upcoming events found`);
    res.status(200).json(events);
  } catch (err) {
    console.error("❌ Failed to fetch upcoming events:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get events for a specific organization
exports.getEventsByOrganization = async (req, res) => {
  try {
    const orgId = req.params.orgId;
    console.log(`🔹 Fetching events for organization: ${orgId}`);

    const events = await Event.find({ organization: orgId });

    console.log(`✅ ${events.length} events found for org: ${orgId}`);
    res.status(200).json(events);
  } catch (err) {
    console.error(`❌ Failed to fetch events for org ${req.params.orgId}:`, err);
    res.status(500).json({ message: err.message });
  }
};

// Get current and upcoming events
exports.getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();
    console.log("🔹 Fetching upcoming events after:", now);

    const events = await Event.find({ date: { $gte: now } })
      .sort({ date: 1 }) // Optional: sort by soonest first
      .populate("organization");

    console.log(`✅ ${events.length} upcoming events found`);
    res.status(200).json(events);
  } catch (err) {
    console.error("❌ Failed to fetch upcoming events:", err);
    res.status(500).json({ message: err.message });
  }
};
