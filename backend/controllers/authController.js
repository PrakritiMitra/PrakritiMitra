const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Organization = require("../models/organization");
const mongoose = require('mongoose');

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

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const interestsArray = Array.isArray(interests)
      ? interests
      : typeof interests === 'string'
      ? [interests]
      : [];

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email,
      phone,
      password: hashedPassword,
      dateOfBirth,
      gender,
      interests: interestsArray,
      city,
      role: "volunteer",
      profileImage: req.file ? req.file.filename : null,
    });


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

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.warn("⚠️ Email already exists:", email);
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profileImage = req.files?.profileImage?.[0]?.filename || null;
    const govtIdProof = req.files?.govtIdProof?.[0]?.filename || null;

    const userData = {
      name,
      username: username.toLowerCase(),
      email,
      phone,
      password: hashedPassword,
      dateOfBirth,
      gender,
      city,
      profileImage,
      govtIdProofUrl: govtIdProof,
      role: "organizer",
    };

    if (organization) {
      userData.organization = organization;
    }

    const user = await User.create(userData);


    res.status(201).json({ token: generateToken(user._id), user });
  } catch (err) {
    console.error("❌ Organizer Signup Error:", err);
    res.status(500).json({ message: err.message });
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

    console.log("✅ Password set successfully for OAuth user:", user.email);

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
