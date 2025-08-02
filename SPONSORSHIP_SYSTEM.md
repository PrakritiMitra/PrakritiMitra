# Sponsorship System Documentation

## Overview

The MumbaiMitra platform now includes a comprehensive sponsorship system that allows organizations to receive sponsorships from both businesses and individuals. The system supports multiple contribution types, tier-based recognition, and a complete workflow from application to approval.

## Features

### 🏢 **Dual Sponsor Types**
- **Business Sponsors**: Companies, organizations, and enterprises
- **Individual Sponsors**: Personal sponsorships and donations

### 💰 **Multiple Contribution Types**
- **Monetary**: Direct financial contributions
- **Goods**: Physical items and materials
- **Service**: Professional services and expertise
- **Media**: Marketing and promotional support

### 🏆 **Tier System**
- **Platinum**: ₹50,000+ (Gray gradient)
- **Gold**: ₹25,000 - ₹49,999 (Yellow gradient)
- **Silver**: ₹10,000 - ₹24,999 (Gray gradient)
- **Community**: ₹5,000 - ₹9,999 (Green gradient)

### 📋 **Complete Workflow**
1. **Application**: Sponsors submit applications via forms
2. **Review**: Organization admins review applications
3. **Approval**: Admins approve, reject, or request changes
4. **Active**: Approved sponsorships become active
5. **Completion**: Track impact and complete sponsorships

## Backend Implementation

### Models

#### `Sponsor` Model
```javascript
{
  user: ObjectId, // Reference to User
  sponsorType: 'business' | 'individual',
  business: {
    name: String,
    industry: String,
    website: String,
    description: String,
    logo: String,
    // ... other business fields
  },
  individual: {
    profession: String,
    organization: String,
    designation: String,
    // ... other individual fields
  },
  contactPerson: String,
  email: String,
  phone: String,
  location: { city, state, country },
  preferences: { focusAreas, preferredTier, maxContribution },
  verificationStatus: 'pending' | 'verified' | 'rejected',
  stats: { totalSponsorships, totalContributionValue }
}
```

#### `Sponsorship` Model
```javascript
{
  sponsor: ObjectId, // Reference to Sponsor
  organization: ObjectId, // Reference to Organization
  event: ObjectId, // Optional reference to Event
  sponsorshipType: 'package' | 'custom',
  contribution: {
    type: 'monetary' | 'goods' | 'service' | 'media',
    description: String,
    value: Number,
    currency: String
  },
  tier: {
    name: String,
    calculatedAt: Date,
    calculatedValue: Number
  },
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed',
  period: { startDate, endDate, isRecurring },
  impact: { volunteersSupported, eventsSupported, totalValue },
  recognition: { logoDisplayed, socialMediaMentions, websiteAcknowledgement }
}
```

#### `SponsorshipIntent` Model
```javascript
{
  sponsor: {
    user: ObjectId, // Optional for existing users
    name: String,
    email: String,
    phone: String,
    sponsorType: 'business' | 'individual',
    // ... business/individual details
  },
  organization: ObjectId,
  event: ObjectId, // Optional
  sponsorship: {
    type: 'monetary' | 'goods' | 'service' | 'media',
    description: String,
    estimatedValue: Number,
    // ... type-specific details
  },
  recognition: {
    desiredTier: String,
    specificBenefits: [String],
    logoDisplay: Boolean,
    socialMediaMention: Boolean,
    websiteAcknowledgement: Boolean
  },
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'converted'
}
```

### API Endpoints

#### Sponsor Management
- `GET /api/sponsors` - Get all sponsors (public)
- `GET /api/sponsors/search` - Search sponsors (public)
- `GET /api/sponsors/:userId` - Get sponsor by user ID (public)
- `POST /api/sponsors` - Create sponsor profile (protected)
- `GET /api/sponsors/profile/me` - Get current user's sponsor profile (protected)
- `PUT /api/sponsors/:id` - Update sponsor profile (protected)
- `DELETE /api/sponsors/:id` - Delete sponsor profile (protected)
- `GET /api/sponsors/stats/me` - Get sponsor statistics (protected)
- `PATCH /api/sponsors/:sponsorId/verify` - Verify sponsor (admin)

#### Sponsorship Management
- `GET /api/sponsorships/organization/:organizationId` - Get organization sponsorships (public)
- `GET /api/sponsorships/event/:eventId` - Get event sponsorships (public)
- `GET /api/sponsorships/stats` - Get sponsorship statistics (public)
- `POST /api/sponsorships` - Create sponsorship (protected)
- `GET /api/sponsorships/:id` - Get sponsorship by ID (protected)
- `PUT /api/sponsorships/:id` - Update sponsorship (protected)
- `DELETE /api/sponsorships/:id` - Delete sponsorship (protected)
- `PATCH /api/sponsorships/:id/approve` - Approve sponsorship (protected)
- `PATCH /api/sponsorships/:id/reject` - Reject sponsorship (protected)
- `PATCH /api/sponsorships/:id/activate` - Activate sponsorship (protected)
- `PATCH /api/sponsorships/:id/complete` - Complete sponsorship (protected)

#### Sponsorship Applications
- `POST /api/sponsorship-intents/apply` - Submit application (public)
- `GET /api/sponsorship-intents/organization/:organizationId` - Get organization applications (protected)
- `GET /api/sponsorship-intents/user/me` - Get user applications (protected)
- `GET /api/sponsorship-intents/:id` - Get application by ID (protected)
- `DELETE /api/sponsorship-intents/:id` - Delete application (protected)
- `PATCH /api/sponsorship-intents/:id/review` - Review application (admin)
- `POST /api/sponsorship-intents/:id/communication` - Add communication record (admin)

## Frontend Implementation

### Pages

#### `SponsorshipDirectoryPage`
- Browse all sponsors in the platform
- Search and filter by type, tier, location
- View sponsor profiles and statistics
- Pagination support

#### `SponsorshipApplicationPage`
- Multi-step application form
- Support for both business and individual sponsors
- Type-specific fields for different contribution types
- Recognition preferences and additional information

### Components

#### `SponsorProfileForm`
- Create and update sponsor profiles
- File upload support for logos and documents
- Business and individual specific fields
- Sponsorship preferences configuration

#### `SponsorProfileDisplay`
- Read-only display of sponsor information
- Statistics and verification status
- Edit and delete actions
- Tier and status indicators

#### `OrganizationSponsorshipSection`
- Display on organization pages
- Show current sponsors and statistics
- Sponsorship packages and contact information
- Call-to-action for new sponsors

### API Services

#### `sponsorAPI`
- Complete sponsor profile management
- File upload handling with FormData
- Statistics and verification functions

#### `sponsorshipAPI`
- Sponsorship relationship management
- Status transitions (approve, reject, activate, complete)
- Helper functions for data formatting

#### `sponsorshipIntentAPI`
- Application submission and management
- Review workflow for admins
- Communication tracking

## File Structure

```
backend/
├── models/
│   ├── sponsor.js
│   ├── sponsorship.js
│   └── sponsorshipIntent.js
├── controllers/
│   ├── sponsorController.js
│   ├── sponsorshipController.js
│   └── sponsorshipIntentController.js
├── routes/
│   ├── sponsorRoutes.js
│   ├── sponsorshipRoutes.js
│   └── sponsorshipIntentRoutes.js
└── uploads/
    └── sponsors/          # Sponsor logos and documents

frontend/
├── src/
│   ├── api/
│   │   ├── sponsor.js
│   │   ├── sponsorship.js
│   │   └── sponsorshipIntent.js
│   ├── components/
│   │   └── sponsor/
│   │       ├── SponsorProfileForm.jsx
│   │       ├── SponsorProfileDisplay.jsx
│   │       ├── OrganizationSponsorshipSection.jsx
│   │       └── index.js
│   └── pages/
│       ├── SponsorshipDirectoryPage.jsx
│       └── SponsorshipApplicationPage.jsx
```

## Usage Examples

### Creating a Sponsor Profile
```javascript
import { sponsorAPI } from '../api';

const sponsorData = {
  sponsorType: 'business',
  contactPerson: 'John Doe',
  email: 'john@company.com',
  phone: '+91-9876543210',
  business: {
    name: 'ABC Company Ltd.',
    industry: 'Technology',
    website: 'https://abc.com'
  },
  location: {
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India'
  },
  files: {
    logo: logoFile,
    gstCertificate: gstFile
  }
};

const response = await sponsorAPI.createSponsor(sponsorData);
```

### Submitting a Sponsorship Application
```javascript
import { sponsorshipIntentAPI } from '../api';

const applicationData = {
  sponsor: {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+91-9876543210',
    sponsorType: 'individual',
    individual: {
      profession: 'Software Engineer'
    }
  },
  sponsorship: {
    type: 'monetary',
    description: 'Supporting environmental conservation events',
    estimatedValue: 25000,
    monetary: {
      amount: 25000,
      paymentMethod: 'bank_transfer'
    }
  },
  recognition: {
    desiredTier: 'gold',
    logoDisplay: true,
    socialMediaMention: true
  }
};

const response = await sponsorshipIntentAPI.submitIntent(applicationData);
```

### Adding Sponsorship Section to Organization Page
```javascript
import { OrganizationSponsorshipSection } from '../components/sponsor';

function OrganizationPage() {
  return (
    <div>
      {/* Other organization content */}
      <OrganizationSponsorshipSection 
        organizationId={organizationId}
        organization={organization}
        isAdmin={isAdmin}
      />
    </div>
  );
}
```

## Configuration

### Organization Sponsorship Settings
Organizations can configure their sponsorship settings in the database:

```javascript
{
  sponsorship: {
    enabled: true,
    description: "Support our mission to create positive change",
    contactEmail: "sponsor@organization.com",
    minimumContribution: 5000,
    allowCustomSponsorship: true
  },
  sponsorshipPackages: [
    {
      name: "Event Sponsorship",
      description: "Support our events and get recognition",
      tiers: [
        { name: "Platinum", minContribution: 50000, benefits: ["..."], maxSponsors: 1 },
        { name: "Gold", minContribution: 25000, benefits: ["..."], maxSponsors: 3 },
        { name: "Silver", minContribution: 10000, benefits: ["..."], maxSponsors: 5 },
        { name: "Community", minContribution: 5000, benefits: ["..."], maxSponsors: 10 }
      ]
    }
  ]
}
```

## Future Enhancements

### Planned Features
1. **Payment Integration**: Direct payment processing
2. **AI Valuation**: Smart valuation of non-monetary contributions using Grok Cloud
3. **Email Notifications**: Automated email system for status updates
4. **Impact Tracking**: Advanced metrics and reporting
5. **Certificate Integration**: Automatic certificate generation for sponsors
6. **Analytics Dashboard**: Comprehensive sponsorship analytics

### Technical Improvements
1. **Real-time Updates**: WebSocket integration for live updates
2. **Advanced Search**: Elasticsearch integration for better search
3. **File Processing**: Image optimization and document processing
4. **Caching**: Redis caching for improved performance
5. **API Rate Limiting**: Protection against abuse

## Security Considerations

1. **Data Privacy**: Sponsor contact information restricted to organization admins
2. **File Upload Security**: Validation and sanitization of uploaded files
3. **Authentication**: All sensitive operations require authentication
4. **Authorization**: Role-based access control for admin functions
5. **Input Validation**: Comprehensive validation on all inputs

## Testing

### Backend Tests
- Unit tests for models and controllers
- Integration tests for API endpoints
- File upload testing
- Authentication and authorization testing

### Frontend Tests
- Component testing with React Testing Library
- Form validation testing
- API integration testing
- User flow testing

## Deployment

### Environment Variables
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/mumbaimitra

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Email (for future implementation)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### File Storage
- Sponsor logos and documents stored in `backend/uploads/sponsors/`
- Automatic directory creation on startup
- Static file serving configured in `server.js`

## Support

For questions or issues with the sponsorship system:

1. Check the API documentation for endpoint details
2. Review the model schemas for data structure
3. Test with the provided examples
4. Check server logs for error details
5. Verify file permissions for uploads directory

## Contributing

When contributing to the sponsorship system:

1. Follow the existing code structure and patterns
2. Add comprehensive error handling
3. Include input validation
4. Update documentation for new features
5. Add tests for new functionality
6. Ensure backward compatibility 