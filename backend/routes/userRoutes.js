// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const User = require('../models/user');
const { profileMultiUpload } = require('../middlewares/upload');
const fs = require('fs');
const path = require('path');

// Helper function to safely delete files
const deleteFile = (filePath, fileName) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${fileName}`);
      return true;
    }
  } catch (error) {
    console.error(`Error deleting file ${fileName}:`, error);
  }
  return false;
};

router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

router.put('/profile', protect, profileMultiUpload, async (req, res) => {
  try {
    console.log('Profile update request received');
    console.log('Files:', req.files);
    console.log('Body:', req.body);
    
    const userId = req.user._id;
    
    // Get current user data to check for existing files
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const updateData = { ...req.body };

    // Parse socials if sent as JSON string
    if (updateData.socials) {
      if (typeof updateData.socials === 'string') {
      try {
        updateData.socials = JSON.parse(updateData.socials);
      } catch (e) {
          console.error('Error parsing socials:', e);
          updateData.socials = {};
        }
      }
      // Ensure socials has the correct structure
      if (typeof updateData.socials === 'object' && updateData.socials !== null) {
        updateData.socials = {
          instagram: updateData.socials.instagram || '',
          linkedin: updateData.socials.linkedin || '',
          twitter: updateData.socials.twitter || '',
          facebook: updateData.socials.facebook || ''
        };
      } else {
        updateData.socials = {};
      }
    }

    // Remove uneditable fields
    delete updateData.organization; // Don't allow changing organization here
    delete updateData.role; // Don't allow changing role
    delete updateData.email; // (optional) if you don't want email to be changed

    // Handle profile image upload
    if (req.files?.profileImage?.[0]) {
      // Delete old profile image if it exists
      if (currentUser.profileImage) {
        const oldProfileImagePath = path.join(__dirname, '../uploads/Profiles', currentUser.profileImage);
        deleteFile(oldProfileImagePath, currentUser.profileImage);
      }
      updateData.profileImage = req.files.profileImage[0].filename;
    } else if (req.body.removeProfileImage === 'true') {
      // Handle profile image removal
      if (currentUser.profileImage) {
        const oldProfileImagePath = path.join(__dirname, '../uploads/Profiles', currentUser.profileImage);
        deleteFile(oldProfileImagePath, currentUser.profileImage);
      }
      updateData.profileImage = null;
    }
    
    if (req.files?.govtIdProof?.[0]) {
      // Delete old government ID proof if it exists
      if (currentUser.govtIdProofUrl) {
        const oldGovtIdPath = path.join(__dirname, '../uploads/Profiles', currentUser.govtIdProofUrl);
        deleteFile(oldGovtIdPath, currentUser.govtIdProofUrl);
      }
      updateData.govtIdProofUrl = req.files.govtIdProof[0].filename;
    } else if (req.body.removeGovtIdProof === 'true') {
      // Handle government ID proof removal
      if (currentUser.govtIdProofUrl) {
        const oldGovtIdPath = path.join(__dirname, '../uploads/Profiles', currentUser.govtIdProofUrl);
        deleteFile(oldGovtIdPath, currentUser.govtIdProofUrl);
      }
      updateData.govtIdProofUrl = null;
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      updateData: updateData
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
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
