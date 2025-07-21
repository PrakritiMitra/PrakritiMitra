// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require("./routes/registrationRoutes");
const resourceRoutes = require('./routes/resourceRoutes');
const chatRoutes = require('./routes/chatRoutes'); // <-- Import chat routes
const initializeSocket = require('./socketHandler'); // <-- Import the handler
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Message = require('./models/Message');

const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:5173', // dev
      'https://your-production-frontend.com' // <-- replace with your deployed frontend URL
    ],
    methods: ['GET', 'POST']
  }
});

// ✅ Enable CORS for all origins (for dev)
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['Authorization'],
}));

app.use('/api/users', require('./routes/userRoutes'));

// ✅ Parse incoming JSON requests
app.use(express.json());

// Make the 'uploads' folder publicly accessible
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/qrcodes', express.static(path.join(__dirname, 'uploads/qrcodes')));


// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/events', eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/chat', chatRoutes); // <-- Use chat routes

// Initialize Socket.IO
initializeSocket(io);

// ✅ Sample home route
app.get("/", (req, res) => {
  res.send("Home Page!");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// No need to export io anymore from here
// module.exports = { app, io };
