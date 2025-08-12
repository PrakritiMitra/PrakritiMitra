const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
      return res.status(400).json({ 
        success: false,
        message: 'Token is required' 
      });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: oauthId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Could not retrieve email from Google account'
      });
    }

    // Check if picture is a default Google placeholder
    const isDefaultPicture = picture && (
      picture.includes('googleusercontent.com') && 
      (picture.includes('=s96-c') || picture.includes('=s48-c') || picture.includes('=s32-c'))
    );
    
    // Only use picture if it's not a default placeholder
    const validPicture = isDefaultPicture ? null : picture;

    // Check if user exists with this OAuth ID (including soft-deleted)
    let user = await User.findOne({ 
      oauthProvider: 'google', 
      oauthId 
    }).select('+originalEmail +email +isDeleted +recoveryToken +recoveryTokenExpires');

    if (user) {
      // Check if account is soft-deleted
      if (user.isDeleted) {
        // Generate a recovery token for the email flow
        const recoveryToken = crypto.randomBytes(32).toString('hex');
        const recoveryTokenExpires = Date.now() + 3600000; // 1 hour
        
        user.recoveryToken = recoveryToken;
        user.recoveryTokenExpires = recoveryTokenExpires;
        await user.save();
        
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_DELETED',
          message: 'This account has been deleted. Please recover your account to continue.',
          canRecover: true,
          recoveryToken,
          email: user.originalEmail || user.email
        });
      }
      
      // User exists with OAuth and account is active - login
      const authToken = generateToken(user._id);
      return res.json({
        success: true,
        action: 'login',
        token: authToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
          profileImage: user.profileImage || user.oauthPicture,
          createdAt: user.createdAt
        }
      });
    }

    // Check if user exists with this email (for account linking or restoration)
    // Include soft-deleted accounts in this check
    user = await User.findOne({ 
      $or: [
        { email },
        { originalEmail: email }
      ]
    }).select('+originalEmail +email +isDeleted +recoveryToken +recoveryTokenExpires +oauthProvider +oauthId +oauthPicture');

    if (user) {
      // If account is soft-deleted, handle recovery flow
      if (user.isDeleted) {
        // Generate a recovery token for the email flow
        const recoveryToken = crypto.randomBytes(32).toString('hex');
        const recoveryTokenExpires = Date.now() + 3600000; // 1 hour
        
        // Update user with recovery token
        user.recoveryToken = recoveryToken;
        user.recoveryTokenExpires = recoveryTokenExpires;
        
        // If this was an OAuth account, update the OAuth info
        if (!user.oauthProvider) {
          user.oauthProvider = 'google';
          user.oauthId = oauthId;
          if (validPicture) user.oauthPicture = validPicture;
        }
        
        await user.save();
        
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_DELETED',
          message: 'This account has been deleted. Please recover your account to continue.',
          canRecover: true,
          recoveryToken,
          email: user.originalEmail || user.email
        });
      }
      
      // If we get here, the account exists and is active
      // If it doesn't have OAuth, we'll need to link it
      if (!user.oauthProvider) {
        return res.status(200).json({
          success: true,
          action: 'link_account',
          email: user.email,
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
          },
          message: 'An account with this email already exists. Would you like to link your Google account?'
        });
      }
      
      // If we get here, the account exists, is active, and has OAuth - log them in
      const authToken = generateToken(user._id);
      return res.json({
        success: true,
        action: 'login',
        token: authToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
          profileImage: user.profileImage || user.oauthPicture,
          createdAt: user.createdAt
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

    // Check if email already exists in active accounts
    let existingUser = await User.findOne({ 
      email,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Check if there's a soft-deleted account with this email
    existingUser = await User.findOne({ 
      email,
      isDeleted: true 
    });
    
    if (existingUser) {
      // Check if this is a recently deleted account (within 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const isRecentlyDeleted = existingUser.deletedAt && existingUser.deletedAt > thirtyDaysAgo;
      
      if (isRecentlyDeleted) {
        // Return information about the recently deleted account
        return res.status(409).json({
          success: false,
          errorType: "RECENTLY_DELETED_ACCOUNT",
          message: "Account with this email was recently deleted",
          deletedAccount: {
            username: existingUser.username,
            name: existingUser.name,
            role: existingUser.role,
            deletedAt: existingUser.deletedAt,
            deletionSequence: existingUser.deletionSequence,
            canRecover: existingUser.deletionId ? true : false
          },
          suggestion: "You can recover your deleted account or create a new one with a different email"
        });
      } else {
        // Account was deleted more than 30 days ago, allow restoration
        existingUser.isDeleted = false;
        existingUser.deletedAt = undefined;
        existingUser.originalEmail = undefined;
        existingUser.oauthProvider = 'google';
        existingUser.oauthId = oauthId;
        existingUser.oauthPicture = picture || null;
        existingUser.role = role;
        existingUser.phone = phone;
        existingUser.interests = interests;
        existingUser.organization = organization;
        existingUser.isEmailVerified = true;
        
        if (username) {
          existingUser.username = username.toLowerCase();
        }
        
        await existingUser.save();
        
        const token = generateToken(existingUser._id);
        return res.status(200).json({
          success: true,
          message: 'Account restored successfully',
          token,
          user: {
            _id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            username: existingUser.username,
            profileImage: existingUser.profileImage || existingUser.oauthPicture,
            createdAt: existingUser.createdAt
          }
        });
      }
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
        profileImage: user.profileImage || user.oauthPicture,
        createdAt: user.createdAt
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
        profileImage: user.profileImage || user.oauthPicture,
        createdAt: user.createdAt
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
