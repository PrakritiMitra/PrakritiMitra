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
    console.log("🔹 Volunteer Signup Request:", req.body);

    const { name, email, password, dateOfBirth, phone, interests, gender } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      console.warn("⚠️ Email already exists:", email);
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      dateOfBirth,
      gender,
      interests,
      role: "volunteer",
    });

    console.log("✅ Volunteer created:", user.email);

    res.status(201).json({ token: generateToken(user._id), user });
  } catch (err) {
    console.error("❌ Volunteer Signup Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Organizer Signup
exports.signupOrganizer = async (req, res) => {
  try {
    console.log("🔹 Organizer Signup Request:", req.body);

    const {
      name,
      email,
      password,
      dateOfBirth,
      phone,
      gender,
      govtIdProofUrl,
      organization,
    } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      console.warn("⚠️ Email already exists:", email);
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      phone,
      password: hashedPassword,
      dateOfBirth,
      gender,
      govtIdProofUrl,
      role: "organizer",
    };

    if (organization) {
      userData.organization = organization;
      console.log("ℹ️ Organizer is joining existing organization:", organization);
    }

    const user = await User.create(userData);

    console.log("✅ Organizer created:", user.email);

    res.status(201).json({ token: generateToken(user._id), user });
  } catch (err) {
    console.error("❌ Organizer Signup Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    console.log("🔹 Login Request:", req.body);

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      console.warn("⚠️ Login failed — user not found:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.warn("⚠️ Login failed — incorrect password for:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("✅ Login successful:", email);

    res.status(200).json({ token: generateToken(user._id), user });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};
