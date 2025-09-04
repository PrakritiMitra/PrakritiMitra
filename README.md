# 🤝 PrakritiMitra

> **Empowering NGOs with Complete Digital Management Solutions**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()

PrakritiMitra is a comprehensive NGO management platform that empowers non-governmental organizations to streamline their operations, manage volunteers, organize events, and maximize their social impact. Our all-in-one solution provides the tools NGOs need to focus on their mission while we handle the administrative complexities.

## 📋 Table of Contents

- [🚀 Features](#-features)
- [🛠️ Technology Stack](#️-technology-stack)
- [📦 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🏗️ Project Structure](#️-project-structure)
- [🔧 API Documentation](#-api-documentation)
- [📱 Usage](#-usage)
- [🤝 Contributing](#-contributing)
- [🚀 Deployment](#-deployment)
- [🧪 Testing](#-testing)
- [📈 Roadmap](#-roadmap)
- [👥 Team](#-team)
- [📄 License](#-license)

## 🚀 Features

### 🌟 Core Functionality
- **🔐 Secure Authentication** - OAuth integration with Google, comprehensive user management
- **🏢 Organization Management** - Complete NGO profiles with verification and document management
- **📅 Event Management** - Create, manage, and track events across all NGO activities with recurring series support
- **👥 Volunteer Coordination** - Time slot management, attendance tracking with QR codes, and volunteer lifecycle management
- **💰 Sponsorship & Fundraising** - Integrated payment gateway for sponsorships, donations, and fundraising campaigns
- **📊 Analytics & Reports** - Comprehensive reporting, impact measurement, and certificate generation
- **💬 Real-time Communication** - Event-specific chat channels and organization-wide messaging
- **📱 Responsive Design** - Mobile-first approach with modern UI/UX for all devices

### 🎯 Key Differentiators
- **AI-Powered Insights** - Automated event summaries, volunteer analytics, and impact assessment
- **Smart Calendar Integration** - Seamless event scheduling, resource allocation, and conflict management
- **Advanced Payment Processing** - Secure sponsorship, donation, and fundraising payment handling
- **Comprehensive Recovery System** - 7-day account recovery with email blocking for data security
- **Certificate Generation** - Automated certificate creation for volunteers, participants, and donors
- **Multi-Cause Support** - Versatile platform supporting various NGO sectors (education, health, environment, social welfare, etc.)

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework with hooks
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API communication
- **React Router** - Client-side routing

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **Socket.io** - Real-time bidirectional communication
- **Multer** - File upload handling
- **JWT** - JSON Web Token authentication

### DevOps & Tools
- **Git** - Version control
- **npm** - Package management
- **ESLint** - Code linting
- **PostCSS** - CSS processing

### 🤖 AI & Machine Learning
- **OpenAI GPT Integration** - AI-powered event summaries and insights generation
- **Natural Language Processing** - Automated content analysis and categorization
- **Smart Recommendations** - AI-driven volunteer matching based on skills and interests
- **Predictive Analytics** - Event success prediction and volunteer engagement forecasting
- **Automated Reporting** - AI-generated impact reports and performance insights
- **Intelligent Chatbot** - AI-powered customer support and event assistance
- **Content Generation** - Automated certificate text and event descriptions
- **Sentiment Analysis** - Volunteer feedback analysis and satisfaction tracking

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn package manager

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/PrakritiMitra.git
   cd PrakritiMitra/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Ensure MongoDB is running
   # Configure connection in config/db.js
   ```

5. **Start the server**
   ```bash
   npm start
   # Development mode: npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/prakritimitra

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# OAuth (Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Server
PORT=5000
NODE_ENV=development
```

## 🏗️ Project Structure

```
PrakritiMitra/
├── backend/                 # Backend API server
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middlewares/        # Custom middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── uploads/            # File uploads
│   ├── utils/              # Utility functions
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── api/            # API integration
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
└── README.md
```

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/forgot-password` - Password recovery

### Event Management
- `GET /api/events` - List all events
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Organization Management
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization

### Volunteer Management
- `POST /api/registrations` - Register for event
- `GET /api/registrations/user/:userId` - User registrations
- `POST /api/attendance` - Mark attendance

For complete API documentation, see [API.md](docs/API.md)

## 📱 Usage

### For NGOs
1. **Register** your organization with verification documents and mission details
2. **Create Events** across various causes (education, health, environment, social welfare, etc.)
3. **Manage Volunteers** through comprehensive dashboard with skill matching
4. **Track Impact** with detailed analytics and reporting tools
5. **Generate Certificates** for volunteers, participants, and donors
6. **Fundraising** through integrated payment gateways and sponsorship management

### For Volunteers
1. **Sign Up** with email or Google account
2. **Browse Events** by location, cause, and personal interests
3. **Register** for events with time slot selection and skill matching
4. **Track Participation** through personal dashboard with impact metrics
5. **Receive Certificates** for completed events and contributions
6. **Connect** with NGOs and fellow volunteers through chat features

### For Donors & Sponsors
1. **Discover NGOs** working on causes you care about
2. **Make Donations** through secure payment gateways
3. **Sponsor Events** with transparent tracking of impact
4. **Receive Updates** on how your contributions are making a difference

### Key Features Demo
- **Event Creation**: Complete event setup with image uploads and cause categorization
- **Volunteer Registration**: Time slot selection, skill matching, and confirmation
- **Attendance Tracking**: QR code-based attendance system with real-time updates
- **Payment Processing**: Secure sponsorship, donation, and fundraising payments
- **Real-time Communication**: Event-specific and organization-wide messaging
- **Impact Analytics**: Comprehensive reporting on volunteer engagement and social impact

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- Follow ESLint configuration
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed

### Issue Reporting
- Use the issue template
- Provide detailed reproduction steps
- Include browser/device information
- Attach relevant screenshots

## 🚀 Deployment

### Production Deployment

1. **Backend Deployment**
   ```bash
   # Set NODE_ENV=production
   npm run build
   npm start
   ```

2. **Frontend Deployment**
   ```bash
   npm run build
   # Deploy dist/ folder to your hosting service
   ```

### Recommended Hosting
- **Backend**: Heroku, Railway, or DigitalOcean
- **Frontend**: Vercel, Netlify, or GitHub Pages
- **Database**: MongoDB Atlas

### Environment Setup
- Configure production environment variables
- Set up SSL certificates
- Configure domain and DNS
- Set up monitoring and logging

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Test Coverage
- Unit tests for utilities and helpers
- Integration tests for API endpoints
- Component tests for React components
- E2E tests for critical user flows

## 📈 Roadmap

### Phase 1 (Current)
- ✅ User authentication and authorization
- ✅ Event management system across multiple causes
- ✅ Volunteer coordination and skill matching
- ✅ Basic reporting and analytics
- ✅ Payment gateway integration

### Phase 2 (In Progress)
- 🔄 Advanced analytics dashboard with impact measurement
- 🔄 Mobile app development for on-the-go management
- 🔄 AI-powered volunteer matching and recommendations
- 🔄 Multi-language support for global NGOs
- 🔄 Advanced fundraising and donation management

### Phase 3 (Planned)
- 📋 Blockchain integration for transparent donation tracking
- 📋 Advanced gamification features for volunteer engagement
- 📋 Integration with government and NGO databases
- 📋 Global expansion with regional customization
- 📋 Advanced resource management and inventory tracking

## 👥 Team

### Core Developers
- **Sidhik Udaysing Thorat** - Full Stack Developer
- **Amrut Avinash Pathane** - Full Stack Developer

### Acknowledgments
- NGO partners for feedback and testing across various sectors
- Open source community for amazing libraries
- Beta testers and early adopters from diverse causes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact & Support

- **Email**: support@prakritimitra.com
- **Website**: [prakritimitra.com](https://prakritimitra.com)
- **Documentation**: [docs.prakritimitra.com](https://docs.prakritimitra.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/PrakritiMitra/issues)

---

<div align="center">
  <p>Made with ❤️ for social impact</p>
  <p>Join us in empowering NGOs to create positive change across all causes!</p>
</div>#   F o r c e   V e r c e l   r e d e p l o y  
 