//backend/controllers/eventController.js

const Event = require('../models/event');
const mongoose = require('mongoose');
const fs = require("fs");
const path = require("path");
const Organization = require("../models/organization");
const axios = require('axios');

// Create new event
exports.createEvent = async (req, res) => {
  try {
    console.log("🔹 Create Event Request Body:", req.body);
    console.log("🖼️ Uploaded Files:", req.files);

    const {
      title,
      description,
      location,
      mapLocation, // This is now an object: { address, lat, lng }
      startDateTime,
      endDateTime,
      eventType,
      maxVolunteers,
      unlimitedVolunteers,
      instructions,
      groupRegistration,
      recurringEvent,
      recurringType,
      recurringValue,
      organization,
      equipmentNeeded,
      otherEquipment,

      // Questionnaire fields
      waterProvided,
      medicalSupport,
      ageGroup,
      precautions,
      publicTransport,
      contactPerson,
    } = req.body;

    // Handle equipment array
    const equipmentArray = Array.isArray(equipmentNeeded)
      ? equipmentNeeded
      : equipmentNeeded
      ? [equipmentNeeded]
      : [];

    if (otherEquipment) equipmentArray.push(otherEquipment);

    // File handling
    const images = req.files?.eventImages?.map((f) => f.filename) || [];
    const approvalLetter = req.files?.govtApprovalLetter?.[0]?.filename || null;

    // Build the event object
    const eventData = {
      title,
      description,
      location, // Original string location
      mapLocation: {
        address: mapLocation.address,
        lat: parseFloat(mapLocation.lat) || null,
        lng: parseFloat(mapLocation.lng) || null,
      },
      startDateTime,
      endDateTime,
      eventType,
      maxVolunteers: unlimitedVolunteers === 'true' ? -1 : parseInt(maxVolunteers),
      unlimitedVolunteers: unlimitedVolunteers === 'true',
      instructions,
      groupRegistration: groupRegistration === 'true',
      recurringEvent: recurringEvent === 'true',
      recurringType: recurringEvent === 'true' ? recurringType : null,
      recurringValue: recurringEvent === 'true' ? recurringValue : null,
      equipmentNeeded: equipmentArray,
      eventImages: images,
      govtApprovalLetter: approvalLetter,
      organization,
      createdBy: req.user._id,
      // Add the creator to organizerTeam by default
      organizerTeam: [{ user: req.user._id, hasAttended: false }],

      // Include questionnaire fields
      waterProvided: waterProvided === 'true',
      medicalSupport: medicalSupport === 'true',
      ageGroup: ageGroup || null,
      precautions: precautions || "",
      publicTransport: publicTransport || "",
      contactPerson: contactPerson || "",
    };

    const event = new Event(eventData);
    await event.save();

    // Respond immediately
    res.status(201).json(event);

    // --- AI SUMMARY GENERATION (background) ---
    setImmediate(async () => {
      try {
        const summaryPrompt = `Write a detailed, engaging, 150-word summary for this event, including what the event is about, its importance, and interesting facts about the location or event type if possible.\n\nEvent: ${event.title}\nDescription: ${event.description}\nType: ${event.eventType}\nLocation: ${event.location}\nDate: ${event.startDateTime}\nOrganizer: ${event.organization}\nPrecautions: ${event.precautions}\nInstructions: ${event.instructions}`;
        const res = await axios.post('http://localhost:5000/api/ai-summary', { prompt: summaryPrompt });
        const summary = res.data.summary;
        await Event.findByIdAndUpdate(event._id, { summary });
        console.log('Summary updated for event', event._id);
      } catch (err) {
        console.error('Failed to generate event summary (background):', err);
      }
    });
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

    const events = await Event.find({ startDateTime: { $exists: true, $gte: now } })
      .sort({ startDateTime: 1 }) // Optional: sort by soonest first
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

    const events = await Event.find({ organization: orgId }).populate("organization");

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

    const upcomingEvents = await Event.find({ startDateTime: { $exists: true, $gte: now } })
      .sort({ startDateTime: 1 }) // Optional: sort by soonest first
      .populate("organization");

    console.log(`✅ ${upcomingEvents.length} upcoming events found`);
    res.status(200).json(upcomingEvents);
  } catch (err) {
    console.error("❌ Failed to fetch upcoming events:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get single event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: 'organization',
        populate: {
          path: 'team.userId',
          model: 'User'
        }
      })
      .populate({
        path: 'createdBy',
        select: 'name profileImage',
      })
      .populate('organizerTeam.user', 'name email phone profileImage');

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (err) {
    console.error("❌ Failed to fetch event by ID:", err);
    res.status(500).json({ message: "Server error fetching event" });
  }
};

// Update Event Controller
exports.updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const org = await Organization.findById(event.organization);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const isCreator = event.createdBy.toString() === userId.toString();
    const isAdmin = org.team.some(
      (m) => m.userId.toString() === userId.toString() && m.status === "approved" && m.isAdmin
    );

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "You are not authorized to edit this event." });
    }

    // ✅ Remove specific existing images if requested
    const removedImages = req.body.removedImages;
    if (removedImages) {
      const toRemove = Array.isArray(removedImages) ? removedImages : [removedImages];
      event.eventImages = event.eventImages.filter((img) => {
        if (toRemove.includes(img)) {
          const imgPath = path.join(__dirname, "../uploads/Events", img);
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
          return false;
        }
        return true;
      });
    }

    // ✅ Remove letter file if requested
    if (req.body.removedLetter === "true" && event.govtApprovalLetter) {
      const letterPath = path.join(__dirname, "../uploads/Events", event.govtApprovalLetter);
      if (fs.existsSync(letterPath)) fs.unlinkSync(letterPath);
      event.govtApprovalLetter = null;
    }

    // ✅ Add new uploaded images (if any)
    if (req.files?.eventImages) {
      const newImages = req.files.eventImages.map((f) => f.filename);
      event.eventImages = [...event.eventImages, ...newImages];
    }

    // ✅ Add new approval letter (if uploaded)
    if (req.files?.govtApprovalLetter?.length) {
      event.govtApprovalLetter = req.files.govtApprovalLetter[0].filename;
    }

    // Form fields
    const {
      title,
      description,
      location,
      mapLocation,
      startDateTime,
      endDateTime,
      eventType,
      maxVolunteers,
      unlimitedVolunteers,
      instructions,
      groupRegistration,
      recurringEvent,
      recurringType,
      recurringValue,
      equipmentNeeded,
      otherEquipment,
      waterProvided,
      medicalSupport,
      ageGroup,
      precautions,
      publicTransport,
      contactPerson,
    } = req.body;

    // Update fields
    event.title = title || event.title;
    event.description = description || event.description;
    event.location = location || event.location;
    
    if (mapLocation && typeof mapLocation === 'object') {
      event.mapLocation = {
        address: mapLocation.address || event.mapLocation.address,
        lat: parseFloat(mapLocation.lat) || event.mapLocation.lat,
        lng: parseFloat(mapLocation.lng) || event.mapLocation.lng,
      };
    }

    event.startDateTime = startDateTime || event.startDateTime;
    event.endDateTime = endDateTime || event.endDateTime;
    event.eventType = eventType || event.eventType;
    event.maxVolunteers =
      unlimitedVolunteers === "true" ? -1 : parseInt(maxVolunteers) || event.maxVolunteers;
    event.unlimitedVolunteers = unlimitedVolunteers === "true";
    event.instructions = instructions || event.instructions;
    event.groupRegistration = groupRegistration === "true";
    event.recurringEvent = recurringEvent === "true";
    event.recurringType = event.recurringEvent ? recurringType : null;
    event.recurringValue = event.recurringEvent ? recurringValue : null;

    // Equipment
    let equipmentArray = Array.isArray(equipmentNeeded)
      ? equipmentNeeded
      : equipmentNeeded
      ? [equipmentNeeded]
      : [];
    if (otherEquipment) equipmentArray.push(otherEquipment);
    event.equipmentNeeded = equipmentArray;

    // Questionnaire
    event.waterProvided = waterProvided === "true";
    event.medicalSupport = medicalSupport === "true";
    event.ageGroup = ageGroup || event.ageGroup;
    event.precautions = precautions || event.precautions;
    event.publicTransport = publicTransport || event.publicTransport;
    event.contactPerson = contactPerson || event.contactPerson;

    // Clear the summary before generating a new one
    event.summary = '';
    await event.save();
    res.status(200).json(event);

    // --- AI SUMMARY GENERATION (background) ---
    setImmediate(async () => {
      try {
        const summaryPrompt = `Write a detailed, engaging, 150-word summary for this event, including what the event is about, its importance, and interesting facts about the location or event type if possible.\n\nEvent: ${event.title}\nDescription: ${event.description}\nType: ${event.eventType}\nLocation: ${event.location}\nDate: ${event.startDateTime}\nOrganizer: ${event.organization}\nPrecautions: ${event.precautions}\nInstructions: ${event.instructions}`;
        const res = await axios.post('http://localhost:5000/api/ai-summary', { prompt: summaryPrompt });
        const summary = res.data.summary;
        await Event.findByIdAndUpdate(event._id, { summary });
        console.log('Summary updated for event', event._id);
      } catch (err) {
        console.error('Failed to generate event summary (background):', err);
      }
    });
  } catch (err) {
    console.error("❌ Failed to update event:", err);
    res.status(500).json({ message: err.message });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organization');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const userId = req.user._id.toString();
    const isCreator = event.createdBy.toString() === userId;

    const isAdmin = event.organization?.team?.some(
      (member) => member.userId.toString() === userId && member.isAdmin
    );

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this event' });
    }

    // ✅ Delete associated files before deleting the event
    try {
      // Delete event images
      if (event.eventImages && event.eventImages.length > 0) {
        event.eventImages.forEach(img => {
          const imgPath = path.join(__dirname, "../uploads/Events", img);
          if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
            console.log(`✅ Deleted event image: ${img}`);
          }
        });
      }

      // Delete government approval letter
      if (event.govtApprovalLetter) {
        const letterPath = path.join(__dirname, "../uploads/Events", event.govtApprovalLetter);
        if (fs.existsSync(letterPath)) {
          fs.unlinkSync(letterPath);
          console.log(`✅ Deleted approval letter: ${event.govtApprovalLetter}`);
        }
      }
    } catch (fileError) {
      console.error('⚠️ Error deleting files:', fileError);
      // Continue with event deletion even if file deletion fails
    }

    // ✅ Delete the event from database
    await Event.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete event:', err);
    res.status(500).json({ message: 'Server error while deleting event' });
  }
};

// Organizer joins an event as a team member
exports.joinAsOrganizer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Prevent creator from joining as team (already main organizer)
    if (event.createdBy.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You are already the main organizer of this event.' });
    }

    // Initialize organizerTeam if it doesn't exist (for old events)
    if (!event.organizerTeam) {
      event.organizerTeam = [];
    }

    // Prevent duplicate join
    if (event.organizerTeam.some(obj => obj.user && obj.user.toString() === userId.toString())) {
      return res.status(400).json({ message: 'You have already joined as an organizer for this event.' });
    }

    event.organizerTeam.push({ user: userId, hasAttended: false });
    await event.save();
    
    // Populate the user field before sending response
    const populatedEvent = await Event.findById(eventId).populate('organizerTeam.user', 'name email phone profileImage');
    res.status(200).json({ message: 'Successfully joined as organizer', event: populatedEvent });
  } catch (err) {
    console.error('❌ Failed to join as organizer:', err);
    res.status(500).json({ message: 'Server error while joining as organizer' });
  }
};

// Get the organizer team for an event
exports.getOrganizerTeam = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    // Populate the user field inside organizerTeam
    const event = await Event.findById(eventId).populate('organizerTeam.user', 'name email phone profileImage');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    // Initialize organizerTeam if it doesn't exist (for old events)
    if (!event.organizerTeam) {
      event.organizerTeam = [];
    }
    
    // If ?full=1, return full objects (for attendance), else just user info
    if (req.query.full === '1') {
      res.status(200).json({ organizerTeam: event.organizerTeam });
    } else {
      res.status(200).json({ organizerTeam: event.organizerTeam.map(obj => obj.user).filter(Boolean) });
    }
  } catch (err) {
    console.error('❌ Failed to fetch organizer team:', err);
    res.status(500).json({ message: 'Server error while fetching organizer team' });
  }
};

// PATCH: Mark attendance for an organizer in organizerTeam
exports.updateOrganizerAttendance = async (req, res) => {
  try {
    const { eventId, organizerId } = req.params;
    const { hasAttended } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const organizer = event.organizerTeam.find(obj => obj.user.toString() === organizerId);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found in team' });
    organizer.hasAttended = !!hasAttended;
    await event.save();
    res.json({ message: 'Attendance updated.', organizer });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating organizer attendance.' });
  }
};