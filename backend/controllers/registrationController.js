const Registration = require("../models/registration");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

exports.registerForEvent = async (req, res) => {
  try {
    const { eventId, groupMembers } = req.body;
    const volunteerId = req.user._id;

    // Prevent duplicate registration
    const alreadyRegistered = await Registration.findOne({ eventId, volunteerId });
    if (alreadyRegistered) {
      return res.status(400).json({ message: "You have already registered for this event." });
    }

    // 1. Create registration first (without QR code)
    const registration = new Registration({
      eventId,
      volunteerId,
      groupMembers: groupMembers || [],
    });
    await registration.save();

    // 2. Generate QR code with registrationId
    const qrData = JSON.stringify({
      registrationId: registration._id,
      eventId,
      volunteerId,
    });

    const fileName = `qr-${registration._id}-${Date.now()}.png`;
    const filePath = path.join(__dirname, "..", "uploads", "qrcodes", fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    await QRCode.toFile(filePath, qrData);

    // 3. Update registration with QR code path
    registration.qrCodePath = `/uploads/qrcodes/${fileName}`;
    await registration.save();

    res.status(201).json({
      message: "Registered successfully.",
      registrationId: registration._id,
      qrCodePath: registration.qrCodePath,
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
};

// Check if user is registered for an event
exports.checkRegistration = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const volunteerId = req.user._id;
    const registration = await Registration.findOne({ eventId, volunteerId });
    res.json({ registered: !!registration });
  } catch (err) {
    res.status(500).json({ registered: false, error: "Server error" });
  }
};

// Withdraw registration for an event (delete registration and QR code)
exports.withdrawRegistration = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const volunteerId = req.user._id;
    const registration = await Registration.findOne({ eventId, volunteerId });
    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }
    // Delete QR code file if exists
    if (registration.qrCodePath) {
      const qrPath = path.join(__dirname, "..", registration.qrCodePath);
      try {
        if (fs.existsSync(qrPath)) {
          fs.unlinkSync(qrPath);
        }
      } catch (err) {
        // Log but don't block deletion
        console.error("Failed to delete QR code file:", err);
      }
    }
    await Registration.deleteOne({ _id: registration._id });
    res.json({ message: "Registration withdrawn successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error during withdrawal." });
  }
};

// Get all event IDs the current user is registered for
exports.getMyRegisteredEvents = async (req, res) => {
  try {
    const volunteerId = req.user._id;
    const registrations = await Registration.find({ volunteerId });
    const registeredEventIds = registrations.map(r => r.eventId.toString());
    res.json({ registeredEventIds });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH: Mark attendance for a volunteer registration
exports.updateAttendance = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { hasAttended } = req.body;
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }
    registration.hasAttended = !!hasAttended;
    await registration.save();
    res.json({ message: 'Attendance updated.', registration });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating attendance.' });
  }
};

// Update getVolunteersForEvent to include hasAttended
exports.getVolunteersForEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    // Find all registrations for this event and populate volunteer details
    const registrations = await Registration.find({ eventId }).populate('volunteerId', 'name email phone profileImage role');
    // Return user details and attendance
    const volunteers = registrations.map(r => ({
      ...r.volunteerId.toObject(),
      hasAttended: r.hasAttended,
      registrationId: r._id
    }));
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching volunteers', error: err });
  }
};

// Get all events a volunteer is registered for
exports.getEventsForVolunteer = async (req, res) => {
  try {
    const volunteerId = req.params.volunteerId;
    // Find all registrations for this volunteer and populate event details
    const registrations = await Registration.find({ volunteerId }).populate({
      path: 'eventId',
      populate: { path: 'organization' }
    });
    // Return only the event details
    const events = registrations.map(r => r.eventId).filter(e => !!e);
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching events', error: err });
  }
};

// Get all registrations for a given volunteerId
exports.getRegistrationsForVolunteer = async (req, res) => {
  try {
    const volunteerId = req.params.volunteerId;
    console.log('[DEBUG] Fetching registrations for volunteerId:', volunteerId);
    const registrations = await Registration.find({ volunteerId });
    console.log('[DEBUG] Registrations found:', registrations.length, registrations.map(r => r.eventId));
    res.json(registrations);
  } catch (err) {
    console.error('[DEBUG] Error fetching registrations:', err);
    res.status(500).json({ message: 'Server error fetching registrations', error: err });
  }
};

// Get a specific registration for a volunteer and event
exports.getRegistrationForVolunteerEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const volunteerId = req.user._id; // from protect middleware

    const registration = await Registration.findOne({ eventId, volunteerId });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }

    res.json(registration);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching registration details." });
  }
};
