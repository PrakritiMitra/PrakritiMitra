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
      return true;
    }
  } catch (error) {
    console.error(`Error deleting file ${fileName}:`, error);
  }
  return false;
};

// Get user counts for statistics - MUST BE BEFORE /:id route
router.get('/counts', async (req, res) => {
  try {
    console.log('🔹 Fetching user counts...');
    console.log('🔹 User model:', typeof User);
    console.log('🔹 User.countDocuments:', typeof User.countDocuments);
    
    // Test if we can query the database
    const totalUsers = await User.countDocuments({});
    console.log('🔹 Total users in database:', totalUsers);
    
    const [volunteerCount, organizerCount] = await Promise.all([
      User.countDocuments({ role: 'volunteer' }),
      User.countDocuments({ role: 'organizer' })
    ]);
    
    console.log(`✅ User counts - Volunteers: ${volunteerCount}, Organizers: ${organizerCount}`);
    
    res.json({
      volunteerCount,
      organizerCount,
      totalUsers // Include this for debugging
    });
  } catch (error) {
    console.error('❌ Error getting user counts:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to get user counts', error: error.message });
  }
});

// Test route to verify API is working
router.get('/test', (req, res) => {
  res.json({ message: 'User routes are working!' });
});

router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        available: false, 
        message: 'Username can only contain letters, numbers, and underscores' 
      });
    }

    // Check if username exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    
    res.json({ 
      available: !existingUser,
      message: existingUser ? 'Username already taken' : 'Username available'
    });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search volunteers
router.get('/volunteers', protect, async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: 'volunteer' };
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { city: searchRegex }
      ];
    }
    
    const volunteers = await User.find(query)
      .select('name username email profileImage city role')
      .limit(20)
      .sort({ name: 1 });
    
    res.json(volunteers);
  } catch (error) {
    console.error('Error searching volunteers:', error);
    res.status(500).json({ message: 'Failed to search volunteers' });
  }
});

// Search organizers
router.get('/organizers', protect, async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: 'organizer' };
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
        { position: searchRegex }
      ];
    }
    
    const organizers = await User.find(query)
      .select('name username email profileImage city role position')
      .limit(20)
      .sort({ name: 1 });
    
    res.json(organizers);
  } catch (error) {
    console.error('Error searching organizers:', error);
    res.status(500).json({ message: 'Failed to search organizers' });
  }
});

router.put('/profile', protect, profileMultiUpload, async (req, res) => {
  try {
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

    // Handle username change
    if (updateData.username && updateData.username !== currentUser.username) {
      // Check if new username is available
      const existingUser = await User.findOne({ 
        username: updateData.username.toLowerCase(),
        _id: { $ne: userId } // Exclude current user
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      
      // Convert username to lowercase
      updateData.username = updateData.username.toLowerCase();
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

    // Handle password update with hashing
    if (updateData.password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
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
