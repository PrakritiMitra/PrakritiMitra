const rateLimit = require('express-rate-limit');

const chatRateLimit = rateLimit({
  windowMs: Number(process.env.CHAT_RATE_WINDOW_MS || 60_000),
  limit: Number(process.env.CHAT_RATE_LIMIT || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    response: 'Too many chat requests. Please wait a moment and try again.'
  }
});

module.exports = { chatRateLimit };

