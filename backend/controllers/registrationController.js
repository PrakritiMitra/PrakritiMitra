const Registration = require("../models/registration");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid');

// Helper to create registration and QR code
async function createRegistrationAndQRCode({ eventId, volunteerId, groupMembers }) {
  const registration = new Registration({
    eventId,
    volunteerId,
    groupMembers: groupMembers || [],
  });
  await registration.save();

  const qrData = JSON.stringify({
    registrationId: registration._id,
    eventId,
    volunteerId,
  });

  const fileName = `qr-${registration._id}-${Date.now()}.png`;
  const filePath = path.join(__dirname, "..", "uploads", "qrcodes", fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await QRCode.toFile(filePath, qrData);
  registration.qrCodePath = `/uploads/qrcodes/${fileName}`;
  await registration.save();
  return registration;
}

exports.registerForEvent = async (req, res) => {
  try {
    const { eventId, groupMembers } = req.body;
    const volunteerId = req.user._id;
    const io = req.app.get('io');

    // Prevent duplicate registration
    const alreadyRegistered = await Registration.findOne({ eventId, volunteerId });
    if (alreadyRegistered) {
      return res.status(400).json({ message: "You have already registered for this event." });
    }

    // Fetch the event
    const Event = require('../models/event');
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Check if user is banned from this event
    if (event.bannedVolunteers && event.bannedVolunteers.includes(volunteerId)) {
      return res.status(403).json({ message: "You are banned from this event and cannot register." });
    }

    // Check if user was removed from this event (they can re-register)
    const wasRemoved = event.removedVolunteers && event.removedVolunteers.includes(volunteerId);
    if (wasRemoved) {
      // Remove them from removedVolunteers array since they're re-registering
      event.removedVolunteers = event.removedVolunteers.filter(id => id.toString() !== volunteerId.toString());
      await event.save();
    }

    // Double-check that volunteer is not in the volunteers array (in case of race condition)
    if (event.volunteers && event.volunteers.includes(volunteerId)) {
      // Remove them from volunteers array
      event.volunteers = event.volunteers.filter(id => id.toString() !== volunteerId.toString());
      await event.save();
    }

    // Unlimited volunteers: allow registration
    if (event.unlimitedVolunteers) {
      const registration = await createRegistrationAndQRCode({ eventId, volunteerId, groupMembers });
      
      // Add volunteer to event's volunteers array for calendar tracking
      const Event = require('../models/event');
      await Event.findByIdAndUpdate(
        eventId,
        { $addToSet: { volunteers: volunteerId } },
        { new: true }
      );
      
      io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
        eventId,
        availableSlots: null, // unlimited
        maxVolunteers: null,
        unlimitedVolunteers: true
      });
      return res.status(201).json({
        message: "Registered successfully.",
        registrationId: registration._id,
        qrCodePath: registration.qrCodePath,
      });
    }

    // Not unlimited: atomic slot check and update
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        $expr: { $lt: [ { $size: "$volunteers" }, event.maxVolunteers ] },
        volunteers: { $ne: volunteerId }
      },
      { $addToSet: { volunteers: volunteerId } },
      { new: true }
    );
    if (!updatedEvent) {
      // Check if volunteer is already in the volunteers array
      const currentEvent = await Event.findById(eventId);
      if (currentEvent.volunteers && currentEvent.volunteers.includes(volunteerId)) {
        return res.status(400).json({ message: "You are already registered for this event." });
      }
      return res.status(400).json({ message: "No slots available." });
    }

    const registration = await createRegistrationAndQRCode({ eventId, volunteerId, groupMembers });
    
    const availableSlots = updatedEvent.maxVolunteers - updatedEvent.volunteers.length;
    io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
      eventId,
      availableSlots,
      maxVolunteers: updatedEvent.maxVolunteers,
      unlimitedVolunteers: false
    });
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
    const io = req.app.get('io');
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

    // Remove the user from the event's volunteers array
    const Event = require('../models/event');
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $pull: { volunteers: volunteerId } },
      { new: true }
    );

    // Emit slotsUpdated event
    if (updatedEvent) {
      if (updatedEvent.unlimitedVolunteers) {
        io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
          eventId,
          availableSlots: null,
          maxVolunteers: null,
          unlimitedVolunteers: true
        });
      } else {
        const availableSlots = updatedEvent.maxVolunteers - updatedEvent.volunteers.length;
        io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
          eventId,
          availableSlots,
          maxVolunteers: updatedEvent.maxVolunteers,
          unlimitedVolunteers: false
        });
      }
    }

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
    // --- Permission logic ---
    // Find the event and its organizerTeam
    const Event = require('../models/event');
    const event = await Event.findById(registration.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    // Find the creator (first in organizerTeam)
    const creatorId = event.organizerTeam?.[0]?.user?.toString?.() || event.createdBy?.toString?.();
    const isCreator = req.user._id.toString() === creatorId;
    // Check if user is in organizerTeam
    const isOrganizer = event.organizerTeam.some(obj => obj.user.toString() === req.user._id.toString());
    // If not an organizer, deny
    if (!isOrganizer) {
      return res.status(403).json({ message: 'Only organizers can mark attendance.' });
    }
    // If not creator, only allow marking attendance for volunteers (not for other organizers)
    if (!isCreator) {
      // Check if the registration is for a volunteer (not an organizer)
      // A volunteer registration will not have their userId in organizerTeam
      const isForOrganizer = event.organizerTeam.some(obj => obj.user.toString() === registration.volunteerId.toString());
      if (isForOrganizer) {
        return res.status(403).json({ message: 'Only the event creator can mark attendance for organizers.' });
      }
    }
    registration.hasAttended = !!hasAttended;
    // If marking as attended and inTime is not set, set inTime, generate exitQrToken, and delete entry QR
    if (hasAttended && !registration.inTime) {
      registration.inTime = new Date();
      if (!registration.exitQrToken) {
        registration.exitQrToken = uuidv4();
      }
      // Delete entry QR image if exists
      if (registration.qrCodePath) {
        const entryQrPath = path.join(__dirname, "..", registration.qrCodePath);
        try {
          if (fs.existsSync(entryQrPath)) {
            fs.unlinkSync(entryQrPath);
          }
        } catch (err) {
          console.error('Failed to delete entry QR code:', err);
        }
        registration.qrCodePath = null;
      }
    }
    await registration.save();
    
    // Emit socket event for real-time attendance updates
    const io = req.app.get('io');
    if (io) {
      io.to(`attendance:${registration.eventId}`).emit('attendanceUpdated', {
        eventId: registration.eventId,
        registrationId: registration._id,
        volunteerId: registration.volunteerId,
        hasAttended: registration.hasAttended,
        inTime: registration.inTime,
        outTime: registration.outTime,
        timestamp: new Date()
      });
    }
    
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
    const registrations = await Registration.find({ eventId }).populate('volunteerId', 'name username email phone profileImage role');
    // Get the event and its organizerTeam
    const Event = require('../models/event');
    const event = await Event.findById(eventId);
    const organizerTeamIds = event ? event.organizerTeam.map(obj => obj.user.toString()) : [];
    
    // Get removed and banned volunteer IDs
    const removedVolunteerIds = event?.removedVolunteers?.map(id => id.toString()) || [];
    const bannedVolunteerIds = event?.bannedVolunteers?.map(id => id.toString()) || [];
    
    // Return user details and attendance, excluding removed and banned volunteers
    const volunteers = registrations
      .filter(r => {
        const volunteerId = r.volunteerId.toString();
        return !organizerTeamIds.includes(volunteerId) && 
               !removedVolunteerIds.includes(volunteerId) && 
               !bannedVolunteerIds.includes(volunteerId);
      })
      .map(r => ({
        ...r.volunteerId.toObject(),
        hasAttended: r.hasAttended,
        registrationId: r._id,
        inTime: r.inTime,
        outTime: r.outTime,
        exitQrToken: r.exitQrToken,
        isOrganizerTeam: false,
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
    const registrations = await Registration.find({ volunteerId });
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
      return res.status(404).json({ 
        message: "Registration not found.",
        registered: false,
        registration: null,
        questionnaireCompleted: false
      });
    }

    // Return registration with proper structure for frontend
    res.json({ 
      registered: true,
      registration: registration,
      questionnaireCompleted: registration.questionnaire?.completed || false
    });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching registration details." });
  }
};

// Entry scan: set inTime, generate exitQrToken, return exit QR
exports.entryScan = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }
    if (!registration.inTime) {
      registration.inTime = new Date();
      registration.exitQrToken = uuidv4();
      // Delete entry QR image if exists
      if (registration.qrCodePath) {
        const entryQrPath = path.join(__dirname, "..", registration.qrCodePath);
        try {
          if (fs.existsSync(entryQrPath)) {
            fs.unlinkSync(entryQrPath);
          }
        } catch (err) {
          console.error('Failed to delete entry QR code:', err);
        }
        registration.qrCodePath = null;
      }
      await registration.save();
    }
    // Do NOT generate exit QR here. Only return inTime and exitQrToken.
    return res.json({
      message: 'Entry recorded.',
      inTime: registration.inTime,
      exitQrToken: registration.exitQrToken
    });
  } catch (err) {
    console.error('Entry scan error:', err);
    res.status(500).json({ message: 'Server error during entry scan.' });
  }
};

// Generate exit QR on demand
exports.generateExitQr = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const registration = await Registration.findById(registrationId);
    if (!registration || !registration.exitQrToken) {
      return res.status(404).json({ message: 'Registration or exit QR token not found.' });
    }
    // Generate exit QR code (token-based)
    const exitQrData = JSON.stringify({ exitQrToken: registration.exitQrToken });
    const fileName = `exitqr-${registration._id}-${Date.now()}.png`;
    const filePath = path.join(__dirname, "..", "uploads", "qrcodes", fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    await QRCode.toFile(filePath, exitQrData);
    registration.exitQrPath = `/uploads/qrcodes/${fileName}`;
    await registration.save();
    return res.json({ exitQrPath: registration.exitQrPath });
  } catch (err) {
    console.error('Exit QR generation error:', err);
    res.status(500).json({ message: 'Server error generating exit QR.' });
  }
};

// Exit scan: set outTime using exitQrToken
exports.exitScan = async (req, res) => {
  try {
    const { exitQrToken } = req.params;
    const registration = await Registration.findOne({ exitQrToken });
    if (!registration) {
      return res.status(404).json({ message: 'Invalid or expired exit QR code.' });
    }
    if (!registration.outTime) {
      registration.outTime = new Date();
      // Delete exit QR image if exists
      if (registration.exitQrPath) {
        const exitQrPath = path.join(__dirname, "..", registration.exitQrPath);
        try {
          if (fs.existsSync(exitQrPath)) {
            fs.unlinkSync(exitQrPath);
          }
        } catch (err) {
          console.error('Failed to delete exit QR code:', err);
        }
        registration.exitQrPath = null;
      }
      await registration.save();
      return res.json({ message: 'Out-time recorded!', outTime: registration.outTime });
    } else {
      return res.json({ message: 'Out-time already recorded.', outTime: registration.outTime });
    }
  } catch (err) {
    console.error('Exit scan error:', err);
    res.status(500).json({ message: 'Server error during exit scan.' });
  }
};

// PATCH: Manually update inTime
exports.updateInTime = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { inTime } = req.body;
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }
    registration.inTime = inTime ? new Date(inTime) : null;
    await registration.save();
    res.json({ message: 'In-time updated.', inTime: registration.inTime });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating in-time.' });
  }
};

// PATCH: Manually update outTime
exports.updateOutTime = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { outTime } = req.body;
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }
    registration.outTime = outTime ? new Date(outTime) : null;
    await registration.save();
    res.json({ message: 'Out-time updated.', outTime: registration.outTime });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating out-time.' });
  }
};

// Complete volunteer questionnaire
exports.completeVolunteerQuestionnaire = async (req, res) => {
  try {
    const { eventId } = req.params;
    const volunteerId = req.user._id;
    let answers = req.body.answers;
    if (typeof answers === 'string') {
      try { answers = JSON.parse(answers); } catch { answers = {}; }
    }

    // Find the registration for this volunteer and event
    const registration = await Registration.findOne({ eventId, volunteerId });
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // Check if questionnaire is already completed
    if (registration.questionnaire && registration.questionnaire.completed) {
      return res.status(400).json({ message: 'You have already submitted your questionnaire.' });
    }

    // Save answers and mark as completed
    registration.questionnaire = {
      completed: true,
      answers: answers || {},
      submittedAt: new Date()
    };
    await registration.save();
    
    res.status(200).json({ 
      message: 'Questionnaire completed', 
      questionnaire: registration.questionnaire 
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to complete questionnaire', 
      error: err.message 
    });
  }
};

// Get questionnaire comments for an event
exports.getEventQuestionnaireComments = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Fetch all registrations with completed questionnaires for this event
    const registrations = await Registration.find({
      eventId,
      'questionnaire.completed': true
    }).populate('volunteerId', 'name username profileImage').sort({ 'questionnaire.submittedAt': -1 });
    
    // Extract comments and relevant data
    const comments = registrations.map(reg => {
      const answers = reg.questionnaire.answers || {};
      // Look for comment fields in the answers (common field names)
      const commentFields = ['comments', 'feedback', 'suggestions', 'additionalComments', 'experience', 'improvements'];
      let comment = '';
      
      // Find the first non-empty comment field
      for (const field of commentFields) {
        if (answers[field] && typeof answers[field] === 'string' && answers[field].trim()) {
          comment = answers[field].trim();
          break;
        }
      }
      
      // If no specific comment field found, look for any text field with substantial content
      if (!comment) {
        for (const [key, value] of Object.entries(answers)) {
          if (typeof value === 'string' && value.trim().length > 20) {
            comment = value.trim();
            break;
          }
        }
      }
      
      return {
        _id: reg._id,
        volunteer: {
          _id: reg.volunteerId._id,
          name: reg.volunteerId.name,
          username: reg.volunteerId.username,
          profileImage: reg.volunteerId.profileImage
        },
        comment: comment || 'No detailed feedback provided',
        submittedAt: reg.questionnaire.submittedAt,
        allAnswers: answers // Include all answers for potential future use
      };
    }).filter(comment => comment.comment !== 'No detailed feedback provided' && comment.comment.trim().length > 0);
    
    res.status(200).json({
      success: true,
      comments,
      total: comments.length
    });
  } catch (err) {
    console.error('Error fetching questionnaire comments:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch questionnaire comments', 
      error: err.message 
    });
  }
};

// Get real-time attendance statistics for an event
exports.getAttendanceStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get the event and its organizerTeam
    const Event = require('../models/event');
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Get all registrations for this event
    const registrations = await Registration.find({ eventId }).populate('volunteerId', 'name username email phone profileImage role');
    
    // Get organizer team IDs
    const organizerTeamIds = event.organizerTeam.map(obj => obj.user.toString());
    
    // Get removed and banned volunteer IDs
    const removedVolunteerIds = event?.removedVolunteers?.map(id => id.toString()) || [];
    const bannedVolunteerIds = event?.bannedVolunteers?.map(id => id.toString()) || [];
    
    // Filter out organizers, removed, and banned volunteers
    const volunteerRegistrations = registrations.filter(r => {
      const volunteerId = r.volunteerId.toString();
      return !organizerTeamIds.includes(volunteerId) && 
             !removedVolunteerIds.includes(volunteerId) && 
             !bannedVolunteerIds.includes(volunteerId);
    });

    // Calculate statistics
    const now = new Date();
    const eventStartTime = new Date(event.startDateTime);
    const eventEndTime = new Date(event.endDateTime);
    
    // Volunteer statistics
    const totalVolunteers = volunteerRegistrations.length;
    const checkedIn = volunteerRegistrations.filter(r => r.inTime).length;
    const checkedOut = volunteerRegistrations.filter(r => r.outTime).length;
    const currentlyPresent = volunteerRegistrations.filter(r => r.inTime && !r.outTime).length;
    const notArrived = totalVolunteers - checkedIn;
    const attendanceRate = totalVolunteers > 0 ? Math.round((checkedIn / totalVolunteers) * 100) : 0;
    
    // Organizer statistics
    const totalOrganizers = event.organizerTeam.length;
    const organizersPresent = event.organizerTeam.filter(obj => obj.hasAttended).length;
    const organizerAttendanceRate = totalOrganizers > 0 ? Math.round((organizersPresent / totalOrganizers) * 100) : 0;
    
    // Overall statistics
    const totalParticipants = totalVolunteers + totalOrganizers;
    const totalPresent = checkedIn + organizersPresent;
    const overallAttendanceRate = totalParticipants > 0 ? Math.round((totalPresent / totalParticipants) * 100) : 0;
    
    // Event status
    const isEventStarted = now >= eventStartTime;
    const isEventEnded = now >= eventEndTime;
    const isEventLive = isEventStarted && !isEventEnded;
    
    // Recent activity (last 10 minutes)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const recentCheckIns = volunteerRegistrations.filter(r => 
      r.inTime && new Date(r.inTime) >= tenMinutesAgo
    ).length;
    const recentCheckOuts = volunteerRegistrations.filter(r => 
      r.outTime && new Date(r.outTime) >= tenMinutesAgo
    ).length;

    const stats = {
      event: {
        id: event._id,
        title: event.title,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        isStarted: isEventStarted,
        isEnded: isEventEnded,
        isLive: isEventLive
      },
      volunteers: {
        total: totalVolunteers,
        checkedIn,
        checkedOut,
        currentlyPresent,
        notArrived,
        attendanceRate
      },
      organizers: {
        total: totalOrganizers,
        present: organizersPresent,
        attendanceRate: organizerAttendanceRate
      },
      overall: {
        totalParticipants,
        totalPresent,
        attendanceRate: overallAttendanceRate
      },
      recentActivity: {
        checkIns: recentCheckIns,
        checkOuts: recentCheckOuts,
        lastUpdated: now
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching attendance stats:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching attendance statistics',
      error: err.message 
    });
  }
};
