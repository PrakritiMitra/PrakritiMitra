// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require("./routes/registrationRoutes");
const path = require('path');

const cors = require('cors');

dotenv.config();
connectDB();

const app = express();

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

// ✅ Sample home route
app.get("/", (req, res) => {
  res.send("Home Page!");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`);
});
