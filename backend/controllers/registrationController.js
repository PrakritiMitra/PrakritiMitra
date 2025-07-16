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

    const payload = {
      eventId,
      volunteerId,
      groupMembers: groupMembers || [],
    };

    // Generate QR Code data
    const qrData = JSON.stringify({
      volunteerId,
      eventId,
      groupMembers,
      registeredAt: new Date(),
    });

    // Save QR Code image to file system
    const fileName = `qr-${volunteerId}-${Date.now()}.png`;
    const filePath = path.join(__dirname, "..", "uploads", "qrcodes", fileName);

    // Ensure folder exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    await QRCode.toFile(filePath, qrData);

    payload.qrCodePath = `/uploads/qrcodes/${fileName}`;

    const registration = new Registration(payload);
    await registration.save();

    res.status(201).json({
      message: "Registered successfully.",
      registrationId: registration._id,
      qrCodePath: payload.qrCodePath,
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
