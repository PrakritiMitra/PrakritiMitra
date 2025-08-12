const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Organization = require("../models/organization");
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Volunteer Signup
exports.signupVolunteer = async (req, res) => {
  try {

    const {
      name,
      username,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      phone,
      interests,
      gender,
      city
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if email already exists in active accounts
    const existingEmail = await User.findOne({
      email,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check for recently deleted accounts with same email
    const recentlyDeletedAccount = await User.findOne({
      email,
      isDeleted: true,
      deletedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Within 30 days
    });

    if (recentlyDeletedAccount) {
      return res.status(409).json({
        message: "Account with this email was recently deleted",
        errorType: "RECENTLY_DELETED_ACCOUNT",
        deletedAccount: {
          username: recentlyDeletedAccount.username,
          name: recentlyDeletedAccount.name,
          role: recentlyDeletedAccount.role,
          deletedAt: recentlyDeletedAccount.deletedAt,
          deletionSequence: recentlyDeletedAccount.deletionSequence,
          canRecover: recentlyDeletedAccount.deletionId ? true : false
        },
        suggestion: "You can recover your deleted account or create a new one with a different email"
      });
    }

    // Check if username already exists in active accounts
    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const interestsArray = Array.isArray(interests)
      ? interests
      : typeof interests === 'string'
      ? [interests]
      : [];

    const userData = {
      name,
      username: username.toLowerCase(),
      email,
      phone,
      password: hashedPassword,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      city,
      role: "volunteer",
      isEmailVerified: false,
      isPhoneVerified: false,
      // Explicitly set OAuth fields to undefined to avoid null issues with the index
      oauthProvider: undefined,
      oauthId: undefined
    };

    const user = new User(userData);

    const profileImage = req.files?.profileImage?.[0]?.filename || null;
    user.profileImage = profileImage;

    await user.save();

    res.status(201).json({ token: generateToken(user._id), user });
  } catch (err) {
    console.error("❌ Volunteer Signup Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Organizer Signup
exports.signupOrganizer = async (req, res) => {
  try {

    const {
      name,
      username,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      phone,
      gender,
      city,
      organization,
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if email already exists in active accounts
    const existingEmail = await User.findOne({
      email,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    
    if (existingEmail) {
      console.warn(`⚠️ Email already exists: ${email}`, {
        existingUserId: existingEmail._id,
        existingUserRole: existingEmail.role,
        oauthProvider: existingEmail.oauthProvider,
        oauthId: existingEmail.oauthId
      });
      return res.status(400).json({ 
        message: "Email already exists",
        errorType: 'EMAIL_EXISTS',
        existingUser: {
          id: existingEmail._id,
          role: existingEmail.role,
          oauthProvider: existingEmail.oauthProvider
        }
      });
    }

    // Check for recently deleted accounts with same email
    const recentlyDeletedAccount = await User.findOne({
      email,
      isDeleted: true,
      deletedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Within 30 days
    });

    if (recentlyDeletedAccount) {
      return res.status(409).json({
        message: "Account with this email was recently deleted",
        errorType: "RECENTLY_DELETED_ACCOUNT",
        deletedAccount: {
          username: recentlyDeletedAccount.username,
          name: recentlyDeletedAccount.name,
          role: recentlyDeletedAccount.role,
          deletedAt: recentlyDeletedAccount.deletedAt,
          deletionSequence: recentlyDeletedAccount.deletionSequence,
          canRecover: recentlyDeletedAccount.deletionId ? true : false
        },
        suggestion: "You can recover your deleted account or create a new one with a different email"
      });
    }

    // Check if username already exists in active accounts
    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profileImage = req.files?.profileImage?.[0]?.filename || null;
    const govtIdProof = req.files?.govtIdProof?.[0]?.filename || null;

    // Create user data object with explicit undefined for OAuth fields
    const userData = {
      name,
      username: username.toLowerCase(),
      email,
      phone,
      password: hashedPassword,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      city,
      organization,
      position,
      role: "organizer",
      isEmailVerified: false,
      isPhoneVerified: false,
      pendingApproval: true,
      oauthProvider: undefined,
      oauthId: undefined
    };

    // Create and save the organizer
    const user = new User(userData);
    user.oauthProvider = undefined;
    user.oauthId = undefined;
    
    // Handle file uploads if any
    if (req.files) {
      if (req.files.profileImage?.[0]?.filename) {
        user.profileImage = req.files.profileImage[0].filename;
      }
      if (req.files.govtIdProof?.[0]?.filename) {
        user.govtIdProofUrl = req.files.govtIdProof[0].filename;
      }
    }
    
    await user.save();
    
    // If organization was provided, update the user
    if (organization) {
      user.organization = organization;
      await user.save();
    }

    res.status(201).json({ 
      token: generateToken(user._id), 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        organization: user.organization
      } 
    });
  } catch (err) {
    console.error("❌ Organizer Signup Error:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      keyPattern: err.keyPattern,
      keyValue: err.keyValue,
      response: err.response?.data
    });
    
    // Handle duplicate key errors specifically
    if (err.code === 11000) {
      console.error('🔑 Duplicate key error details:', {
        keyPattern: err.keyPattern,
        keyValue: err.keyValue
      });
      return res.status(400).json({ 
        message: 'This account already exists. Please try logging in instead.',
        errorType: 'DUPLICATE_ACCOUNT',
        duplicateFields: err.keyValue
      });
    }
    
    res.status(500).json({ 
      message: err.message,
      errorType: 'SERVER_ERROR'
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      console.warn("⚠️ Login failed — user not found:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is OAuth-only (no password set)
    if (!user.password) {
      console.warn("⚠️ Login failed — OAuth user trying to login with password:", email);
      return res.status(400).json({ 
        message: "This account was created with Google. Please use 'Sign in with Google' to login." 
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.warn("⚠️ Login failed — incorrect password for:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({ token: generateToken(user._id), user });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Set password for OAuth users
exports.setPassword = async (req, res) => {
  try {
    const { userId, password, confirmPassword } = req.body;

    if (!userId || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user already has a password
    if (user.password) {
      return res.status(400).json({ message: "Password is already set for this account" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ 
      message: "Password set successfully. You can now login with email and password.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username
      }
    });

  } catch (err) {
    console.error("❌ Set Password Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Forgot Password - Send reset email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email (only active accounts)
    const user = await User.findOne({ 
      email, 
      isDeleted: false 
    });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email address" });
    }

    // Check if user has a password (not OAuth-only)
    if (!user.password) {
      return res.status(400).json({ 
        message: "This account was created with Google. Please use 'Sign in with Google' to login." 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset Request - PrakritiMitra',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset for your PrakritiMitra account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <p>Best regards,<br>PrakritiMitra Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "Password reset email sent successfully. Please check your email." 
    });

  } catch (err) {
    console.error("❌ Forgot Password Error:", err);
    res.status(500).json({ message: "Failed to send reset email. Please try again." });
  }
};

// Verify Reset Token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    res.status(200).json({ 
      valid: true,
      email: user.email,
      message: "Token is valid"
    });

  } catch (err) {
    console.error("❌ Verify Reset Token Error:", err);
    res.status(500).json({ message: "Failed to verify token" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ 
      message: "Password reset successfully. You can now login with your new password." 
    });

  } catch (err) {
    console.error("❌ Reset Password Error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};
