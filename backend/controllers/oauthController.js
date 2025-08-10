const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Generate username from name
const generateUsername = (name) => {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.floor(Math.random() * 1000);
  return `${base}${random}`;
};

// Check username availability
const checkUsernameAvailability = async (username) => {
  const existingUser = await User.findOne({ username: username.toLowerCase() });
  return !existingUser;
};

// Generate unique username
const generateUniqueUsername = async (name) => {
  let username = generateUsername(name);
  let counter = 0;
  
  while (!(await checkUsernameAvailability(username)) && counter < 10) {
    counter++;
    username = generateUsername(name) + counter;
  }
  
  return username;
};

// Google OAuth callback
exports.googleCallback = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: oauthId, email, name, picture } = payload;

    // Check if picture is a default Google placeholder
    const isDefaultPicture = picture && (
      picture.includes('googleusercontent.com') && 
      (picture.includes('=s96-c') || picture.includes('=s48-c') || picture.includes('=s32-c'))
    );
    
    // Only use picture if it's not a default placeholder
    const validPicture = isDefaultPicture ? null : picture;

    // Check if user exists with this OAuth ID
    let user = await User.findOne({ oauthProvider: 'google', oauthId });

    if (user) {
      // User exists with OAuth - login
      const token = generateToken(user._id);
      return res.json({
        success: true,
        action: 'login',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
          profileImage: user.profileImage || user.oauthPicture
        }
      });
    }

    // Check if user exists with this email (for account linking)
    user = await User.findOne({ email });

    if (user) {
      // User exists with email but no OAuth - offer account linking
      return res.json({
        success: true,
        action: 'link_account',
        existingUser: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
          createdAt: user.createdAt
        },
        oauthData: {
          oauthId,
          name,
          email,
          picture: validPicture,
          provider: 'google'
        }
      });
    }
    
    // If we get here, it means the email doesn't exist in our system
    // but we'll prevent creating a new account with OAuth if there's an existing email/password account
    // This is a safety check in case the email check above fails for some reason
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in with your password and link your Google account from the profile settings.'
      });
    }

    // New user - return OAuth data for registration completion
    return res.json({
      success: true,
      action: 'register',
      oauthData: {
        oauthId,
        name,
        email,
        picture: validPicture
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'OAuth authentication failed' });
  }
};

// Complete OAuth registration
exports.completeOAuthRegistration = async (req, res) => {
  try {
    const {
      oauthId,
      name,
      email,
      picture,
      role,
      phone,
      username,
      interests,
      organization
    } = req.body;

    // Validate required fields
    if (!oauthId || !name || !email || !role || !phone) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Generate username if not provided
    let finalUsername = username;
    if (!finalUsername) {
      finalUsername = await generateUniqueUsername(name);
    } else {
      // Check username availability
      const usernameAvailable = await checkUsernameAvailability(finalUsername);
      if (!usernameAvailable) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    // Create user data
    const userData = {
      name,
      username: finalUsername.toLowerCase(),
      email,
      phone,
      oauthProvider: 'google',
      oauthId,
      oauthPicture: picture || null,
      role,
      isEmailVerified: true, // Auto-verified for OAuth users
    };

    // Add optional fields if provided
    if (interests && Array.isArray(interests)) userData.interests = interests;
    if (organization) userData.organization = organization;

    // Create user
    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        profileImage: user.profileImage || user.oauthPicture
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
};

// Link OAuth to existing account
exports.linkOAuthAccount = async (req, res) => {
  try {
    const { userId, oauthId, name, email, picture } = req.body;

    if (!userId || !oauthId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find existing user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OAuth ID is already linked to another account
    const existingOAuth = await User.findOne({ oauthProvider: 'google', oauthId });
    if (existingOAuth) {
      return res.status(400).json({ message: 'This Google account is already linked to another user' });
    }

    // Preserve all existing user data and only add OAuth information
    const existingData = {
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      password: user.password,
      role: user.role,
      dateOfBirth: user.dateOfBirth,
      city: user.city,
      gender: user.gender,
      profileImage: user.profileImage,
      interests: user.interests,
      location: user.location,
      organization: user.organization,
      position: user.position,
      pendingApproval: user.pendingApproval,
      govtIdProofUrl: user.govtIdProofUrl,
      emergencyPhone: user.emergencyPhone,
      socials: user.socials,
      aboutMe: user.aboutMe,
      certificates: user.certificates,
      sponsor: user.sponsor,
      sponsoredEvents: user.sponsoredEvents,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Update user with OAuth data while preserving existing data
    Object.assign(user, existingData, {
      oauthProvider: 'google',
      oauthId: oauthId,
      oauthPicture: picture || null,
      isEmailVerified: true // Auto-verify email for OAuth users
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Google account linked successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        profileImage: user.profileImage || user.oauthPicture
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Account linking failed' });
  }
};

// Unlink OAuth account
exports.unlinkOAuthAccount = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has password (can't unlink if no password)
    if (!user.password) {
      return res.status(400).json({ 
        message: 'Cannot unlink Google account. Please set a password first.' 
      });
    }

    // Remove OAuth data
    user.oauthProvider = null;
    user.oauthId = null;
    user.oauthPicture = null;

    await user.save();

    res.json({
      success: true,
      message: 'Google account unlinked successfully'
    });

  } catch (error) {
    res.status(500).json({ message: 'Account unlinking failed' });
  }
};

// Check username availability
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const available = await checkUsernameAvailability(username);
    
    res.json({
      available,
      message: available ? 'Username is available' : 'Username is not available'
    });

  } catch (error) {
    console.error('Username Check Error:', error);
    res.status(500).json({ message: 'Username check failed' });
  }
};
