const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
  let token;

  // Log the actual header sent
  console.log("Authorization Header:", req.headers.authorization);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

const requireOrganizer = (req, res, next) => {
  if (req.user && req.user.role === 'organizer') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Organizer role required' });
};

module.exports = { protect, requireOrganizer };
