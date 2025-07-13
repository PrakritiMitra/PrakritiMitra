// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const User = require('../models/user');
const upload = require('../middlewares/upload');

router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', protect, upload.single('profileImage'), async (req, res) => {
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
    if (req.file) {
      updateData.profileImage = req.file.filename;
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

module.exports = router;
