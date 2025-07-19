// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const User = require('../models/user');
const { upload } = require('../middlewares/upload');

router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', protect, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'govtIdProof', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = { ...req.body };

    // Parse socials if sent as JSON string
    if (updateData.socials && typeof updateData.socials === 'string') {
      try {
        updateData.socials = JSON.parse(updateData.socials);
      } catch (e) {
        updateData.socials = {};
      }
    }

    // Remove uneditable fields
    delete updateData.organization; // Don't allow changing organization here
    delete updateData.role; // Don't allow changing role
    delete updateData.email; // (optional) if you don't want email to be changed

    // Handle profile image upload
    if (req.files?.profileImage?.[0]) {
      updateData.profileImage = req.files.profileImage[0].filename;
    }
    if (req.files?.govtIdProof?.[0]) {
      updateData.govtIdProofUrl = req.files.govtIdProof[0].filename;
    }

    // Remove password from update data if it's not being changed
    if (!updateData.password) {
      delete updateData.password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Public: Get user by ID (for organizer profile view)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -dateOfBirth');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
