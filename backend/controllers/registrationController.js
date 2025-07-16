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
