// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables first
dotenv.config();

// Configure Cloudinary immediately after loading environment variables
require('./config/cloudinary');

const { errorHandler } = require('./utils/errorResponse');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require("./routes/registrationRoutes");
const resourceRoutes = require('./routes/resourceRoutes');
const chatboxRoutes = require('./routes/chatboxRoutes'); // <-- Import chatbox routes
const initializeSocket = require('./socketHandler'); // <-- Import the handler
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Message = require('./models/Message');
const chatRoutes = require('./routes/chatRoutes');
const aiSummaryRoutes = require('./routes/aiSummaryRoutes');
const faqRoutes = require('./routes/faqRoutes');
const reportRoutes = require('./routes/reportRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const recurringEventRoutes = require('./routes/recurringEventRoutes');
const sponsorRoutes = require('./routes/sponsorRoutes');
const sponsorshipRoutes = require('./routes/sponsorshipRoutes');
const sponsorshipIntentRoutes = require('./routes/sponsorshipIntentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const sponsorshipIntentPaymentRoutes = require('./routes/sponsorshipIntentPaymentRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const accountRoutes = require('./routes/accountRoutes');

const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Attach io to app for controller access
app.set('io', io);

// ✅ Parse incoming JSON requests
app.use(express.json());

// ✅ Enable CORS for production
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://prakriti-mitra.vercel.app',
  /^https:\/\/prakriti-mitra.*\.vercel\.app$/, // Allow all Vercel deployment URLs
  'http://localhost:5173',
  'https://prakriti-mitra-git-main-amrut00s-projects.vercel.app', // Vercel preview URLs
  /^https:\/\/prakriti-mitra.*\.vercel\.app$/ // Catch all Vercel URLs
].filter(Boolean);

// Add CORS debugging
app.use((req, res, next) => {
  console.log('CORS Debug - Origin:', req.headers.origin);
  console.log('CORS Debug - Allowed Origins:', allowedOrigins);
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      console.log('CORS Success - Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('CORS Error - Origin not allowed:', origin);
      // For debugging, temporarily allow all origins in production
      if (process.env.NODE_ENV === 'production') {
        console.log('CORS Debug - Allowing origin in production mode:', origin);
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  exposedHeaders: ['Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Note: All file serving is now handled by Cloudinary
// The uploads folder is no longer used for static file serving


// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/organizations', organizationRoutes);
app.use('/api/events', eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/chatbox', chatboxRoutes); // <-- Use chatbox routes
app.use('/api/chat', chatRoutes);
app.use('/api/ai-summary', aiSummaryRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/recurring-events', recurringEventRoutes);

// Sponsorship routes
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/sponsorships', sponsorshipRoutes);
app.use('/api/sponsorship-intents', sponsorshipIntentRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);
app.use('/api/intent-payments', sponsorshipIntentPaymentRoutes);
app.use('/api/receipts', receiptRoutes);

// OAuth routes
app.use('/api/oauth', oauthRoutes);

// Account management routes
app.use('/api/account', accountRoutes);

// Initialize Socket.IO
initializeSocket(io);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    origin: req.headers.origin 
  });
});

// Serve static files from the React app build directory
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  // Development mode - just send a simple response
  app.get("/", (req, res) => {
    res.send("Home Page!");
  });
}

// Error handler middleware (must be after all routes)
app.use(errorHandler);

// ✅ Start server
const PORT = process.env.PORT || 5000;
const serverInstance = server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  serverInstance.close(() => process.exit(1));
});

// No need to export io anymore from here
// module.exports = { app, io };
